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

async function obtenerNovedadId(idNovedad) {
  if (!idNovedad) return null;

  const { data } = await supabase
    .from("cad_novedades")
    .select("id")
    .eq("id_novedad", idNovedad)
    .maybeSingle();

  return data?.id ?? null;
}

async function importarCadBitacora() {
  const range = "BITACORA_NOVEDADES!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja BITACORA_NOVEDADES no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxIdNovedad = buscarColumna(headers, [
    "ID_NOVEDAD",
    "ID NOVEDAD",
    "NOVEDAD_ID",
  ]);
  const idxAccion = buscarColumna(headers, ["ACCION", "ACCIÓN"]);
  const idxEstadoAnterior = buscarColumna(headers, [
    "ESTADO_ANTERIOR",
    "ESTADO ANTERIOR",
  ]);
  const idxEstadoNuevo = buscarColumna(headers, [
    "ESTADO_NUEVO",
    "ESTADO NUEVO",
  ]);
  const idxComentario = buscarColumna(headers, [
    "COMENTARIO",
    "OBSERVACION",
    "OBSERVACIÓN",
    "DETALLE",
  ]);

  if (idxIdNovedad === -1 || idxAccion === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: ID_NOVEDAD y ACCION."
    );
  }

  const bitacora = [];

  for (const row of rows.slice(1)) {
    const idNovedad = normalizarTexto(row[idxIdNovedad]).toUpperCase();
    const accion = normalizarTexto(row[idxAccion]).toUpperCase();

    if (!idNovedad || !accion) continue;

    const novedadId = await obtenerNovedadId(idNovedad);

    bitacora.push({
      novedad_id: novedadId,
      accion,
      estado_anterior:
        idxEstadoAnterior >= 0
          ? normalizarTexto(row[idxEstadoAnterior]).toUpperCase() || null
          : null,
      estado_nuevo:
        idxEstadoNuevo >= 0
          ? normalizarTexto(row[idxEstadoNuevo]).toUpperCase() || null
          : null,
      comentario:
        idxComentario >= 0 ? normalizarTexto(row[idxComentario]) || null : null,
    });
  }

  console.log(`Registros de bitácora CAD preparados: ${bitacora.length}`);

  const { error: deleteError } = await supabase
    .from("cad_bitacora_novedades")
    .delete()
    .not("id", "is", null);

  if (deleteError) {
    console.error("Error limpiando cad_bitacora_novedades:", deleteError);
    throw deleteError;
  }

  if (bitacora.length === 0) {
    console.log("No hay registros válidos de bitácora para importar.");
    return;
  }

  const batchSize = 500;

  for (let i = 0; i < bitacora.length; i += batchSize) {
    const batch = bitacora.slice(i, i + batchSize);

    const { error } = await supabase
      .from("cad_bitacora_novedades")
      .insert(batch);

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${bitacora.length}`);
  }

  console.log("Importación de BITACORA_NOVEDADES completada.");
}

importarCadBitacora().catch((error) => {
  console.error(error);
  process.exit(1);
});