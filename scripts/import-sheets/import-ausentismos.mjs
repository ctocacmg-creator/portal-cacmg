import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const spreadsheetId = process.env.GOOGLE_NOMINA_SHEET_ID || process.env.GOOGLE_SHEET_ID;
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

function normalizarNumero(valor) {
  const numero = Number(String(valor ?? "").replace(",", ".").trim());
  return Number.isFinite(numero) ? numero : null;
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

async function importarAusentismos() {
  const range = "AUSENTISMOS!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja AUSENTISMOS no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxCedula = buscarColumna(headers, ["CEDULA", "CÉDULA"]);
  const idxNombre = buscarColumna(headers, ["NOMBRE", "NOMBRES", "APELLIDOS Y NOMBRES"]);
  const idxTipo = buscarColumna(headers, ["TIPO_AUSENTISMO", "TIPO AUSENTISMO", "TIPO", "MOTIVO"]);
  const idxFechaInicio = buscarColumna(headers, ["FECHA_INICIO", "FECHA INICIO", "DESDE"]);
  const idxFechaFin = buscarColumna(headers, ["FECHA_FIN", "FECHA FIN", "HASTA"]);
  const idxDias = buscarColumna(headers, ["DIAS", "DÍAS"]);
  const idxEstado = buscarColumna(headers, ["ESTADO"]);
  const idxDocumento = buscarColumna(headers, ["DOCUMENTO_RESPALDO", "DOCUMENTO RESPALDO", "DOCUMENTO"]);
  const idxObservacion = buscarColumna(headers, ["OBSERVACION", "OBSERVACIÓN"]);

  if (idxCedula === -1 || idxTipo === -1 || idxFechaInicio === -1 || idxFechaFin === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: CEDULA, TIPO_AUSENTISMO, FECHA_INICIO, FECHA_FIN."
    );
  }

  const ausentismos = [];

  for (const row of rows.slice(1)) {
    const cedula = normalizarCedula(row[idxCedula]);
    const tipo = normalizarTexto(row[idxTipo]).toUpperCase();
    const fechaInicio = normalizarFecha(row[idxFechaInicio]);
    const fechaFin = normalizarFecha(row[idxFechaFin]);

    if (!cedula || !tipo || !fechaInicio || !fechaFin) continue;

    const { data: persona } = await supabase
      .from("personas")
      .select("id")
      .eq("cedula", cedula)
      .maybeSingle();

    ausentismos.push({
      persona_id: persona?.id ?? null,
      cedula,
      nombre: idxNombre >= 0 ? normalizarTexto(row[idxNombre]).toUpperCase() : null,
      tipo_ausentismo: tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias: idxDias >= 0 ? normalizarNumero(row[idxDias]) : null,
      estado:
        idxEstado >= 0 && normalizarTexto(row[idxEstado])
          ? normalizarTexto(row[idxEstado]).toUpperCase()
          : "ACTIVO",
      documento_respaldo:
        idxDocumento >= 0 ? normalizarTexto(row[idxDocumento]) || null : null,
      observacion:
        idxObservacion >= 0 ? normalizarTexto(row[idxObservacion]) || null : null,
    });
  }

  console.log(`Ausentismos preparados para importar: ${ausentismos.length}`);

  if (ausentismos.length === 0) {
    console.log("No hay ausentismos válidos para importar.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("ausentismos")
    .delete()
    .neq("cedula", "__NO_EXISTE__");

  if (deleteError) {
    console.error("Error limpiando ausentismos:", deleteError);
    throw deleteError;
  }

  const batchSize = 500;

  for (let i = 0; i < ausentismos.length; i += batchSize) {
    const batch = ausentismos.slice(i, i + batchSize);

    const { error } = await supabase.from("ausentismos").insert(batch);

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${ausentismos.length}`);
  }

  console.log("Importación de AUSENTISMOS completada.");
}

importarAusentismos().catch((error) => {
  console.error(error);
  process.exit(1);
});