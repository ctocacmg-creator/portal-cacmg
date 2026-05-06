import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const spreadsheetId = process.env.GOOGLE_CICLOS_SHEET_ID;
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

async function importarCiclos() {
  const range = "CICLOS!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja CICLOS no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxNombre = buscarColumna(headers, [
    "NOMBRE_CICLO",
    "NOMBRE CICLO",
    "CICLO",
    "NOMBRE",
  ]);

  const idxTipo = buscarColumna(headers, [
    "TIPO_CICLO",
    "TIPO CICLO",
    "TIPO",
  ]);

  const idxDiasTrabajo = buscarColumna(headers, [
    "DIAS_TRABAJO",
    "DÍAS_TRABAJO",
    "DIAS TRABAJO",
    "DÍAS TRABAJO",
    "TRABAJO",
  ]);

  const idxDiasDescanso = buscarColumna(headers, [
    "DIAS_DESCANSO",
    "DÍAS_DESCANSO",
    "DIAS DESCANSO",
    "DÍAS DESCANSO",
    "DESCANSO",
  ]);

  const idxDescripcion = buscarColumna(headers, [
    "DESCRIPCION",
    "DESCRIPCIÓN",
    "DETALLE",
    "OBSERVACION",
    "OBSERVACIÓN",
  ]);

  const idxEstado = buscarColumna(headers, ["ESTADO"]);

  if (idxNombre === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error("No se encontró columna obligatoria: NOMBRE_CICLO / CICLO.");
  }

  const ciclos = [];

  for (const row of rows.slice(1)) {
    const nombreCiclo = normalizarTexto(row[idxNombre]).toUpperCase();

    if (!nombreCiclo) continue;

    ciclos.push({
      nombre_ciclo: nombreCiclo,
      tipo_ciclo:
        idxTipo >= 0 ? normalizarTexto(row[idxTipo]).toUpperCase() || null : null,
      dias_trabajo:
        idxDiasTrabajo >= 0 ? normalizarNumero(row[idxDiasTrabajo]) : null,
      dias_descanso:
        idxDiasDescanso >= 0 ? normalizarNumero(row[idxDiasDescanso]) : null,
      descripcion:
        idxDescripcion >= 0 ? normalizarTexto(row[idxDescripcion]) || null : null,
      estado:
        idxEstado >= 0 && normalizarTexto(row[idxEstado])
          ? normalizarTexto(row[idxEstado]).toUpperCase()
          : "ACTIVO",
    });
  }

  console.log(`Ciclos preparados para importar: ${ciclos.length}`);

  if (ciclos.length === 0) {
    console.log("No hay ciclos válidos para importar.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("ciclos_trabajo")
    .delete()
    .neq("nombre_ciclo", "__NO_EXISTE__");

  if (deleteError) {
    console.error("Error limpiando ciclos_trabajo:", deleteError);
    throw deleteError;
  }

  const { error } = await supabase.from("ciclos_trabajo").insert(ciclos);

  if (error) {
    console.error("Error importando ciclos:", error);
    throw error;
  }

  console.log("Importación de CICLOS completada.");
}

importarCiclos().catch((error) => {
  console.error(error);
  process.exit(1);
});