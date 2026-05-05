import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const spreadsheetId =
  process.env.GOOGLE_NOMINA_SHEET_ID || process.env.GOOGLE_SHEET_ID;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!supabaseUrl || !serviceRoleKey || !spreadsheetId || !credentialsPath) {
  throw new Error("Faltan variables en .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

function normalizarTexto(valor) {
  return String(valor ?? "").trim();
}

function normalizarCedula(valor) {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

function normalizarFecha(valor) {
  const texto = normalizarTexto(valor);

  if (!texto) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  const partes = texto.split(/[\/\-]/);

  if (partes.length === 3) {
    const dia = partes[0].padStart(2, "0");
    const mes = partes[1].padStart(2, "0");
    const anio = partes[2].length === 2 ? `20${partes[2]}` : partes[2];

    return `${anio}-${mes}-${dia}`;
  }

  return null;
}

function buscarColumna(headers, posiblesNombres) {
  const normalizados = headers.map((header) =>
    normalizarTexto(header).toUpperCase()
  );

  for (const nombre of posiblesNombres) {
    const index = normalizados.indexOf(nombre.toUpperCase());
    if (index !== -1) return index;
  }

  return -1;
}

function normalizarPuedeOperativo(valor) {
  const texto = normalizarTexto(valor).toUpperCase();

  if (!texto) return "SI";

  if (["NO", "N", "NO OPERATIVO", "BLOQUEADO"].includes(texto)) {
    return "NO";
  }

  if (["RESTRINGIDO", "RESTRICCION", "RESTRICCIÓN", "LIMITADO"].includes(texto)) {
    return "RESTRINGIDO";
  }

  return "SI";
}

async function importarCondicionesEspeciales() {
  const range = "CONDICIONES_ESPECIALES!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja CONDICIONES_ESPECIALES no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxCedula = buscarColumna(headers, ["CEDULA", "CÉDULA"]);
  const idxNombre = buscarColumna(headers, [
    "NOMBRE",
    "NOMBRES",
    "APELLIDOS Y NOMBRES",
  ]);
  const idxTipo = buscarColumna(headers, [
    "TIPO_CONDICION",
    "TIPO CONDICION",
    "TIPO CONDICIÓN",
    "TIPO",
    "CONDICION",
    "CONDICIÓN",
  ]);
  const idxFechaInicio = buscarColumna(headers, [
    "FECHA_INICIO",
    "FECHA INICIO",
    "DESDE",
  ]);
  const idxFechaFin = buscarColumna(headers, [
    "FECHA_FIN",
    "FECHA FIN",
    "HASTA",
  ]);
  const idxRestriccion = buscarColumna(headers, [
    "RESTRICCION_OPERATIVA",
    "RESTRICCIÓN OPERATIVA",
    "RESTRICCION",
    "RESTRICCIÓN",
  ]);
  const idxPlanTrabajo = buscarColumna(headers, [
    "PLAN_TRABAJO",
    "PLAN TRABAJO",
  ]);
  const idxPuedeOperativo = buscarColumna(headers, [
    "PUEDE_OPERATIVO",
    "PUEDE OPERATIVO",
    "OPERATIVO",
    "PUEDE TRABAJAR",
  ]);
  const idxEstado = buscarColumna(headers, ["ESTADO"]);
  const idxDocumento = buscarColumna(headers, [
    "DOCUMENTO_RESPALDO",
    "DOCUMENTO RESPALDO",
    "DOCUMENTO",
  ]);
  const idxObservacion = buscarColumna(headers, ["OBSERVACION", "OBSERVACIÓN"]);

  if (idxCedula === -1 || idxTipo === -1 || idxFechaInicio === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: CEDULA, TIPO_CONDICION, FECHA_INICIO."
    );
  }

  const condiciones = [];

  for (const row of rows.slice(1)) {
    const cedula = normalizarCedula(row[idxCedula]);
    const tipoCondicion = normalizarTexto(row[idxTipo]).toUpperCase();
    const fechaInicio = normalizarFecha(row[idxFechaInicio]);
    const fechaFin = idxFechaFin >= 0 ? normalizarFecha(row[idxFechaFin]) : null;

    if (!cedula || !tipoCondicion || !fechaInicio) continue;

    const { data: persona } = await supabase
      .from("personas")
      .select("id")
      .eq("cedula", cedula)
      .maybeSingle();

    condiciones.push({
      persona_id: persona?.id ?? null,
      cedula,
      nombre:
        idxNombre >= 0 ? normalizarTexto(row[idxNombre]).toUpperCase() : null,
      tipo_condicion: tipoCondicion,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      restriccion_operativa:
        idxRestriccion >= 0
          ? normalizarTexto(row[idxRestriccion]).toUpperCase() || null
          : null,
      plan_trabajo:
        idxPlanTrabajo >= 0
          ? normalizarTexto(row[idxPlanTrabajo]).toUpperCase() || null
          : null,
      puede_operativo:
        idxPuedeOperativo >= 0
          ? normalizarPuedeOperativo(row[idxPuedeOperativo])
          : "SI",
      estado:
        idxEstado >= 0 && normalizarTexto(row[idxEstado])
          ? normalizarTexto(row[idxEstado]).toUpperCase()
          : "ACTIVO",
      documento_respaldo:
        idxDocumento >= 0 ? normalizarTexto(row[idxDocumento]) || null : null,
      observacion:
        idxObservacion >= 0
          ? normalizarTexto(row[idxObservacion]) || null
          : null,
    });
  }

  console.log(
    `Condiciones especiales preparadas para importar: ${condiciones.length}`
  );

  const { error: deleteError } = await supabase
    .from("condiciones_especiales")
    .delete()
    .neq("cedula", "__NO_EXISTE__");

  if (deleteError) {
    console.error("Error limpiando condiciones especiales:", deleteError);
    throw deleteError;
  }

  if (condiciones.length === 0) {
    console.log("No hay condiciones especiales válidas para importar.");
    return;
  }

  const batchSize = 500;

  for (let i = 0; i < condiciones.length; i += batchSize) {
    const batch = condiciones.slice(i, i + batchSize);

    const { error } = await supabase
      .from("condiciones_especiales")
      .insert(batch);

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${condiciones.length}`);
  }

  console.log("Importación de CONDICIONES_ESPECIALES completada.");
}

importarCondicionesEspeciales().catch((error) => {
  console.error(error);
  process.exit(1);
});