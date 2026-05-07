import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SPREADSHEET_ID =
  process.env.GOOGLE_NOMINA_SHEET_ID ||
  process.env.GOOGLE_SHEETS_NOMINA_ID ||
  process.env.GOOGLE_SHEET_ID;

const SHEET_NAME = process.env.GOOGLE_SHEETS_NOMINA_HOJA || "NOMINA";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function limpiarCedula(valor) {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

function limpiarCodigo(valor) {
  return String(valor ?? "").trim();
}

function buscarIndice(headers, nombresPosibles) {
  const headersNormalizados = headers.map(normalizarTexto);

  for (const nombre of nombresPosibles) {
    const indice = headersNormalizados.indexOf(normalizarTexto(nombre));

    if (indice >= 0) {
      return indice;
    }
  }

  return -1;
}

async function crearAuthGoogle() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS en .env.local");
  }

  return new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function main() {
  console.log("Leyendo variables desde .env.local...");
  console.log("GOOGLE_NOMINA_SHEET_ID:", process.env.GOOGLE_NOMINA_SHEET_ID ? "OK" : "NO");
  console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID ? "OK" : "NO");
  console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS ? "OK" : "NO");

  if (!SPREADSHEET_ID) {
    throw new Error(
      "Falta GOOGLE_NOMINA_SHEET_ID, GOOGLE_SHEETS_NOMINA_ID o GOOGLE_SHEET_ID en .env.local"
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
    );
  }

  const auth = await crearAuthGoogle();
  const sheets = google.sheets({ version: "v4", auth });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:ZZ`,
  });

  const rows = response.data.values ?? [];

  if (rows.length === 0) {
    throw new Error(`La hoja ${SHEET_NAME} no tiene filas.`);
  }

  const headers = rows[0];

  const idxCedula = buscarIndice(headers, [
    "CEDULA",
    "CÉDULA",
    "IDENTIFICACION",
    "IDENTIFICACIÓN",
  ]);

  const idxCodigo = buscarIndice(headers, [
    "CODIGO VALIDACION",
    "CÓDIGO VALIDACIÓN",
    "CODIGO DE VALIDACION",
    "CÓDIGO DE VALIDACIÓN",
  ]);

  console.log("Sheet usado:", SPREADSHEET_ID);
  console.log("Hoja usada:", SHEET_NAME);
  console.log("Encabezados encontrados:", headers);

  if (idxCedula < 0) {
    throw new Error("No se encontró columna CEDULA en NOMINA.");
  }

  if (idxCodigo < 0) {
    throw new Error("No se encontró columna CODIGO VALIDACION en NOMINA.");
  }

  let actualizados = 0;
  let omitidos = 0;
  let sinCoincidencia = 0;

  for (const row of rows.slice(1)) {
    const cedula = limpiarCedula(row[idxCedula]);
    const codigoValidacion = limpiarCodigo(row[idxCodigo]);

    if (!cedula || !codigoValidacion) {
      omitidos++;
      continue;
    }

    const { data, error } = await supabase
      .from("personas")
      .update({
        codigo_validacion: codigoValidacion,
      })
      .eq("cedula", cedula)
      .select("id");

    if (error) {
      console.error(`Error actualizando ${cedula}:`, error.message);
      omitidos++;
      continue;
    }

    if (!data || data.length === 0) {
      sinCoincidencia++;
      continue;
    }

    actualizados++;
  }

  console.log("Actualización de códigos completada.");
  console.log("Actualizados:", actualizados);
  console.log("Omitidos por cédula/código vacío:", omitidos);
  console.log("Sin coincidencia en personas:", sinCoincidencia);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});