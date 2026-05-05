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

function normalizarFecha(valor) {
  const texto = normalizarTexto(valor);

  if (!texto) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const partes = texto.split(/[\/\-]/);

  if (partes.length === 3) {
    const dia = partes[0].padStart(2, "0");
    const mes = partes[1].padStart(2, "0");
    const anio = partes[2].length === 2 ? `20${partes[2]}` : partes[2];

    return `${anio}-${mes}-${dia}`;
  }

  return null;
}

function normalizarHora(valor) {
  const texto = normalizarTexto(valor);

  if (!texto) return null;

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(texto)) {
    return texto.length === 5 ? `${texto}:00` : texto;
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

async function obtenerNovedadId(idNovedad) {
  if (!idNovedad) return null;

  const { data } = await supabase
    .from("cad_novedades")
    .select("id")
    .eq("id_novedad", idNovedad)
    .maybeSingle();

  return data?.id ?? null;
}

async function importarCadApoyos() {
  const range = "APOYOS_NOVEDADES!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja APOYOS_NOVEDADES no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxIdNovedad = buscarColumna(headers, [
    "ID_NOVEDAD",
    "ID NOVEDAD",
    "NOVEDAD_ID",
  ]);
  const idxCedula = buscarColumna(headers, ["CEDULA", "CÉDULA"]);
  const idxNombre = buscarColumna(headers, ["NOMBRE", "NOMBRES"]);
  const idxDistrito = buscarColumna(headers, ["DISTRITO"]);
  const idxPuestoOrigen = buscarColumna(headers, [
    "ID_PUESTO_ORIGEN",
    "ID PUESTO ORIGEN",
    "PUESTO_ORIGEN",
    "PUESTO ORIGEN",
  ]);
  const idxPuestoDestino = buscarColumna(headers, [
    "ID_PUESTO_DESTINO",
    "ID PUESTO DESTINO",
    "PUESTO_DESTINO",
    "PUESTO DESTINO",
  ]);
  const idxTipoApoyo = buscarColumna(headers, [
    "TIPO_APOYO",
    "TIPO APOYO",
    "TIPO",
  ]);
  const idxEstadoApoyo = buscarColumna(headers, [
    "ESTADO_APOYO",
    "ESTADO APOYO",
    "ESTADO",
  ]);
  const idxObservacion = buscarColumna(headers, [
    "OBSERVACION",
    "OBSERVACIÓN",
    "DETALLE",
  ]);
  const idxFechaCierre = buscarColumna(headers, [
    "FECHA_CIERRE",
    "FECHA CIERRE",
  ]);
  const idxHoraCierre = buscarColumna(headers, ["HORA_CIERRE", "HORA CIERRE"]);

  if (idxIdNovedad === -1 || idxCedula === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: ID_NOVEDAD y CEDULA."
    );
  }

  const apoyos = [];

  for (const row of rows.slice(1)) {
    const idNovedad = normalizarTexto(row[idxIdNovedad]).toUpperCase();
    const cedula = normalizarCedula(row[idxCedula]);

    if (!idNovedad || !cedula) continue;

    const novedadId = await obtenerNovedadId(idNovedad);

    apoyos.push({
      novedad_id: novedadId,
      cedula,
      nombre:
        idxNombre >= 0 ? normalizarTexto(row[idxNombre]).toUpperCase() || null : null,
      distrito:
        idxDistrito >= 0
          ? normalizarTexto(row[idxDistrito]).toUpperCase() || null
          : null,
      id_puesto_origen:
        idxPuestoOrigen >= 0
          ? normalizarTexto(row[idxPuestoOrigen]).toUpperCase() || null
          : null,
      id_puesto_destino:
        idxPuestoDestino >= 0
          ? normalizarTexto(row[idxPuestoDestino]).toUpperCase() || null
          : null,
      tipo_apoyo:
        idxTipoApoyo >= 0
          ? normalizarTexto(row[idxTipoApoyo]).toUpperCase() || null
          : null,
      estado_apoyo:
        idxEstadoApoyo >= 0 && normalizarTexto(row[idxEstadoApoyo])
          ? normalizarTexto(row[idxEstadoApoyo]).toUpperCase()
          : "ACTIVO",
      observacion:
        idxObservacion >= 0 ? normalizarTexto(row[idxObservacion]) || null : null,
      fecha_cierre:
        idxFechaCierre >= 0 ? normalizarFecha(row[idxFechaCierre]) : null,
      hora_cierre:
        idxHoraCierre >= 0 ? normalizarHora(row[idxHoraCierre]) : null,
    });
  }

  console.log(`Apoyos CAD preparados: ${apoyos.length}`);

  const { error: deleteError } = await supabase
    .from("cad_apoyos_novedades")
    .delete()
    .not("id", "is", null);

  if (deleteError) {
    console.error("Error limpiando cad_apoyos_novedades:", deleteError);
    throw deleteError;
  }

  if (apoyos.length === 0) {
    console.log("No hay apoyos válidos para importar.");
    return;
  }

  const batchSize = 500;

  for (let i = 0; i < apoyos.length; i += batchSize) {
    const batch = apoyos.slice(i, i + batchSize);

    const { error } = await supabase.from("cad_apoyos_novedades").insert(batch);

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${apoyos.length}`);
  }

  console.log("Importación de APOYOS_NOVEDADES completada.");
}

importarCadApoyos().catch((error) => {
  console.error(error);
  process.exit(1);
});