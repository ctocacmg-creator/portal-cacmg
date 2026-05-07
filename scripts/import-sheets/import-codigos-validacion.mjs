import "dotenv/config";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_NOMINA_ID;
const SHEET_NAME = process.env.GOOGLE_SHEETS_NOMINA_HOJA ?? "NOMINA";

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

function crearAuthGoogle() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en .env.local"
    );
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function main() {
  if (!SPREADSHEET_ID) {
    throw new Error("Falta GOOGLE_SHEETS_NOMINA_ID en .env.local");
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
    );
  }

  const auth = crearAuthGoogle();
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
    throw new Error("La hoja NOMINA no tiene filas.");
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

  console.log("Encabezados encontrados:", headers);

  if (idxCedula < 0) {
    throw new Error("No se encontró columna CEDULA en NOMINA.");
  }

  if (idxCodigo < 0) {
    throw new Error("No se encontró columna CODIGO VALIDACION en NOMINA.");
  }

  let actualizados = 0;
  let omitidos = 0;

  for (const row of rows.slice(1)) {
    const cedula = limpiarCedula(row[idxCedula]);
    const codigoValidacion = limpiarCodigo(row[idxCodigo]);

    if (!cedula || !codigoValidacion) {
      omitidos++;
      continue;
    }

    const { error } = await supabase
      .from("personas")
      .update({
        codigo_validacion: codigoValidacion,
      })
      .eq("cedula", cedula);

    if (error) {
      console.error(`Error actualizando ${cedula}:`, error.message);
      omitidos++;
      continue;
    }

    actualizados++;
  }

  console.log("Actualización de códigos completada.");
  console.log("Actualizados:", actualizados);
  console.log("Omitidos:", omitidos);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});