import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const spreadsheetId = process.env.GOOGLE_CAD_SHEET_ID;
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

async function importarEstadoTiempoReal() {
  const range = "ESTADO_TIEMPO_REAL!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja ESTADO_TIEMPO_REAL no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxIdPuesto = buscarColumna(headers, [
    "ID_PUESTO",
    "ID PUESTO",
    "PUESTO",
  ]);
  const idxDistrito = buscarColumna(headers, ["DISTRITO"]);
  const idxCircuito = buscarColumna(headers, ["CIRCUITO"]);
  const idxSubcircuito = buscarColumna(headers, [
    "SUBCIRCUITO",
    "SUB CIRCUITO",
  ]);
  const idxCedula = buscarColumna(headers, ["CEDULA", "CÉDULA"]);
  const idxNombre = buscarColumna(headers, ["NOMBRE", "NOMBRES"]);
  const idxEstadoOperativo = buscarColumna(headers, [
    "ESTADO_OPERATIVO",
    "ESTADO OPERATIVO",
    "ESTADO",
  ]);
  const idxUbicacion = buscarColumna(headers, [
    "UBICACION_REFERENCIAL",
    "UBICACIÓN_REFERENCIAL",
    "UBICACION",
    "UBICACIÓN",
  ]);
  const idxObservacion = buscarColumna(headers, [
    "OBSERVACION",
    "OBSERVACIÓN",
    "DETALLE",
  ]);

  if (idxIdPuesto === -1 && idxCedula === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontró ID_PUESTO ni CEDULA. Se necesita al menos una de esas columnas."
    );
  }

  const estados = [];

  for (const row of rows.slice(1)) {
    const idPuesto =
      idxIdPuesto >= 0
        ? normalizarTexto(row[idxIdPuesto]).toUpperCase()
        : null;

    const cedula =
      idxCedula >= 0 ? normalizarCedula(row[idxCedula]) : null;

    if (!idPuesto && !cedula) continue;

    estados.push({
      id_puesto: idPuesto || null,
      distrito:
        idxDistrito >= 0
          ? normalizarTexto(row[idxDistrito]).toUpperCase() || null
          : null,
      circuito:
        idxCircuito >= 0
          ? normalizarTexto(row[idxCircuito]).toUpperCase() || null
          : null,
      subcircuito:
        idxSubcircuito >= 0
          ? normalizarTexto(row[idxSubcircuito]).toUpperCase() || null
          : null,
      cedula,
      nombre:
        idxNombre >= 0
          ? normalizarTexto(row[idxNombre]).toUpperCase() || null
          : null,
      estado_operativo:
        idxEstadoOperativo >= 0 && normalizarTexto(row[idxEstadoOperativo])
          ? normalizarTexto(row[idxEstadoOperativo]).toUpperCase()
          : "DISPONIBLE",
      ubicacion_referencial:
        idxUbicacion >= 0 ? normalizarTexto(row[idxUbicacion]) || null : null,
      observacion:
        idxObservacion >= 0
          ? normalizarTexto(row[idxObservacion]) || null
          : null,
      ultima_actualizacion: new Date().toISOString(),
    });
  }

  console.log(`Estados CAD preparados: ${estados.length}`);

  const { error: deleteError } = await supabase
    .from("cad_estado_tiempo_real")
    .delete()
    .not("id", "is", null);

  if (deleteError) {
    console.error("Error limpiando cad_estado_tiempo_real:", deleteError);
    throw deleteError;
  }

  if (estados.length === 0) {
    console.log("No hay estados válidos para importar.");
    return;
  }

  const batchSize = 500;

  for (let i = 0; i < estados.length; i += batchSize) {
    const batch = estados.slice(i, i + batchSize);

    const { error } = await supabase
      .from("cad_estado_tiempo_real")
      .insert(batch);

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${estados.length}`);
  }

  console.log("Importación de ESTADO_TIEMPO_REAL completada.");
}

importarEstadoTiempoReal().catch((error) => {
  console.error(error);
  process.exit(1);
});