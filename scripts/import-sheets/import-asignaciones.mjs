import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const spreadsheetId = process.env.GOOGLE_ASIGNACION_SHEET_ID;
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

async function obtenerPersonaId(cedula) {
  const { data } = await supabase
    .from("personas")
    .select("id")
    .eq("cedula", cedula)
    .maybeSingle();

  return data?.id ?? null;
}

async function obtenerPuestoId(idPuesto) {
  const { data } = await supabase
    .from("puestos_operativos")
    .select("id")
    .eq("id_puesto", idPuesto)
    .maybeSingle();

  return data?.id ?? null;
}

async function importarAsignaciones() {
  const range = "ASIGNACION!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja ASIGNACION no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxCedula = buscarColumna(headers, ["CEDULA", "CÉDULA"]);
  const idxIdPuesto = buscarColumna(headers, ["ID_PUESTO", "ID PUESTO"]);
  const idxGrupo = buscarColumna(headers, ["GRUPO"]);
  const idxArea = buscarColumna(headers, ["AREA", "ÁREA"]);
  const idxFuncion = buscarColumna(headers, ["FUNCION", "FUNCIÓN"]);
  const idxHorario = buscarColumna(headers, ["HORARIO"]);
  const idxLugarFormacion = buscarColumna(headers, [
    "LUGAR DE FORMACION",
    "LUGAR DE FORMACIÓN",
    "LUGAR_FORMACION",
  ]);
  const idxBaseLegal = buscarColumna(headers, ["BASE LEGAL", "BASE_LEGAL"]);
  const idxObservacion = buscarColumna(headers, ["OBSERVACION", "OBSERVACIÓN"]);
  const idxEncargado = buscarColumna(headers, [
    "ENCARGADO O JEFE INMEDIATO",
    "ENCARGADO",
    "JEFE INMEDIATO",
  ]);
  const idxFechaInicio = buscarColumna(headers, [
    "FECHA INICIO",
    "FECHA_INICIO",
  ]);
  const idxFechaFin = buscarColumna(headers, ["FECHA FIN", "FECHA_FIN"]);
  const idxEstado = buscarColumna(headers, [
    "ESTADO ASIGNACION",
    "ESTADO ASIGNACIÓN",
    "ESTADO_ASIGNACION",
    "ESTADO",
  ]);

  if (idxCedula === -1 || idxIdPuesto === -1 || idxFechaInicio === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: CEDULA, ID_PUESTO, FECHA INICIO."
    );
  }

  const asignaciones = [];

  for (const row of rows.slice(1)) {
    const cedula = normalizarCedula(row[idxCedula]);
    const idPuesto = normalizarTexto(row[idxIdPuesto]).toUpperCase();
    const fechaInicio = normalizarFecha(row[idxFechaInicio]);

    if (!cedula || !idPuesto || !fechaInicio) continue;

    const personaId = await obtenerPersonaId(cedula);
    const puestoId = await obtenerPuestoId(idPuesto);

    asignaciones.push({
      persona_id: personaId,
      puesto_id: puestoId,
      cedula,
      id_puesto: idPuesto,
      grupo: idxGrupo >= 0 ? normalizarTexto(row[idxGrupo]).toUpperCase() || null : null,
      area: idxArea >= 0 ? normalizarTexto(row[idxArea]).toUpperCase() || null : null,
      funcion:
        idxFuncion >= 0 ? normalizarTexto(row[idxFuncion]).toUpperCase() || null : null,
      horario:
        idxHorario >= 0 ? normalizarTexto(row[idxHorario]).toUpperCase() || null : null,
      lugar_formacion:
        idxLugarFormacion >= 0
          ? normalizarTexto(row[idxLugarFormacion]).toUpperCase() || null
          : null,
      base_legal:
        idxBaseLegal >= 0
          ? normalizarTexto(row[idxBaseLegal]).toUpperCase() || null
          : null,
      observacion:
        idxObservacion >= 0 ? normalizarTexto(row[idxObservacion]) || null : null,
      encargado:
        idxEncargado >= 0
          ? normalizarTexto(row[idxEncargado]).toUpperCase() || null
          : null,
      fecha_inicio: fechaInicio,
      fecha_fin: idxFechaFin >= 0 ? normalizarFecha(row[idxFechaFin]) : null,
      estado_asignacion:
        idxEstado >= 0 && normalizarTexto(row[idxEstado])
          ? normalizarTexto(row[idxEstado]).toUpperCase()
          : "ACTIVO",
    });
  }

  console.log(`Asignaciones preparadas para importar: ${asignaciones.length}`);

  if (asignaciones.length === 0) {
    console.log("No hay asignaciones válidas para importar.");
    return;
  }

  console.log("Limpiando asignaciones existentes...");
  const { error: deleteError } = await supabase
    .from("asignaciones")
    .delete()
    .neq("cedula", "__NO_EXISTE__");

  if (deleteError) {
    console.error("Error limpiando asignaciones:", deleteError);
    throw deleteError;
  }

  const batchSize = 500;

  for (let i = 0; i < asignaciones.length; i += batchSize) {
    const batch = asignaciones.slice(i, i + batchSize);

    const { error } = await supabase.from("asignaciones").insert(batch);

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${asignaciones.length}`);
  }

  console.log("Importación de ASIGNACION completada.");
}

importarAsignaciones().catch((error) => {
  console.error(error);
  process.exit(1);
});