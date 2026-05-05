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

async function importarCadNovedades() {
  const range = "NOVEDADES_OPERATIVAS!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja NOVEDADES_OPERATIVAS no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxIdNovedad = buscarColumna(headers, [
    "ID_NOVEDAD",
    "ID NOVEDAD",
    "NOVEDAD_ID",
    "CODIGO",
    "CÓDIGO",
  ]);
  const idxFecha = buscarColumna(headers, ["FECHA"]);
  const idxHora = buscarColumna(headers, ["HORA"]);
  const idxTipo = buscarColumna(headers, [
    "TIPO_NOVEDAD",
    "TIPO NOVEDAD",
    "TIPO",
  ]);
  const idxPrioridad = buscarColumna(headers, ["PRIORIDAD"]);
  const idxDistrito = buscarColumna(headers, ["DISTRITO"]);
  const idxCircuito = buscarColumna(headers, ["CIRCUITO"]);
  const idxSubcircuito = buscarColumna(headers, ["SUBCIRCUITO", "SUB CIRCUITO"]);
  const idxPuesto = buscarColumna(headers, ["ID_PUESTO", "ID PUESTO", "PUESTO"]);
  const idxCedulaReporta = buscarColumna(headers, [
    "CEDULA_REPORTA",
    "CÉDULA_REPORTA",
    "CEDULA REPORTA",
    "CEDULA",
    "CÉDULA",
  ]);
  const idxNombreReporta = buscarColumna(headers, [
    "NOMBRE_REPORTA",
    "NOMBRE REPORTA",
    "NOMBRE",
    "NOMBRES",
  ]);
  const idxDescripcion = buscarColumna(headers, [
    "DESCRIPCION",
    "DESCRIPCIÓN",
    "DETALLE",
    "NOVEDAD",
  ]);
  const idxAccionTomada = buscarColumna(headers, [
    "ACCION_TOMADA",
    "ACCIÓN_TOMADA",
    "ACCION TOMADA",
    "ACCIÓN TOMADA",
  ]);
  const idxEstado = buscarColumna(headers, [
    "ESTADO_NOVEDAD",
    "ESTADO NOVEDAD",
    "ESTADO",
  ]);
  const idxAsignadoA = buscarColumna(headers, ["ASIGNADO_A", "ASIGNADO A"]);
  const idxFechaCierre = buscarColumna(headers, [
    "FECHA_CIERRE",
    "FECHA CIERRE",
  ]);
  const idxHoraCierre = buscarColumna(headers, ["HORA_CIERRE", "HORA CIERRE"]);
  const idxEvidencia = buscarColumna(headers, [
    "EVIDENCIA_URL",
    "EVIDENCIA",
    "URL_EVIDENCIA",
  ]);

  if (idxFecha === -1 || idxDescripcion === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: FECHA y DESCRIPCION/DETALLE/NOVEDAD."
    );
  }

  const novedades = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const fecha = normalizarFecha(row[idxFecha]);
    const descripcion = normalizarTexto(row[idxDescripcion]);

    if (!fecha || !descripcion) continue;

    const idNovedad =
      idxIdNovedad >= 0 && normalizarTexto(row[idxIdNovedad])
        ? normalizarTexto(row[idxIdNovedad]).toUpperCase()
        : `CAD-${fecha}-${String(index + 1).padStart(5, "0")}`;

    novedades.push({
      id_novedad: idNovedad,
      fecha,
      hora: idxHora >= 0 ? normalizarHora(row[idxHora]) : null,
      tipo_novedad:
        idxTipo >= 0 ? normalizarTexto(row[idxTipo]).toUpperCase() || null : null,
      prioridad:
        idxPrioridad >= 0
          ? normalizarTexto(row[idxPrioridad]).toUpperCase() || null
          : null,
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
      id_puesto:
        idxPuesto >= 0 ? normalizarTexto(row[idxPuesto]).toUpperCase() || null : null,
      cedula_reporta:
        idxCedulaReporta >= 0 ? normalizarCedula(row[idxCedulaReporta]) || null : null,
      nombre_reporta:
        idxNombreReporta >= 0
          ? normalizarTexto(row[idxNombreReporta]).toUpperCase() || null
          : null,
      descripcion,
      accion_tomada:
        idxAccionTomada >= 0 ? normalizarTexto(row[idxAccionTomada]) || null : null,
      estado_novedad:
        idxEstado >= 0 && normalizarTexto(row[idxEstado])
          ? normalizarTexto(row[idxEstado]).toUpperCase()
          : "ABIERTA",
      asignado_a:
        idxAsignadoA >= 0
          ? normalizarTexto(row[idxAsignadoA]).toUpperCase() || null
          : null,
      fecha_cierre:
        idxFechaCierre >= 0 ? normalizarFecha(row[idxFechaCierre]) : null,
      hora_cierre:
        idxHoraCierre >= 0 ? normalizarHora(row[idxHoraCierre]) : null,
      evidencia_url:
        idxEvidencia >= 0 ? normalizarTexto(row[idxEvidencia]) || null : null,
    });
  }

  console.log(`Novedades CAD preparadas para importar: ${novedades.length}`);

  if (novedades.length === 0) {
    console.log("No hay novedades CAD válidas para importar.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("cad_novedades")
    .delete()
    .neq("id_novedad", "__NO_EXISTE__");

  if (deleteError) {
    console.error("Error limpiando cad_novedades:", deleteError);
    throw deleteError;
  }

  const batchSize = 500;

  for (let i = 0; i < novedades.length; i += batchSize) {
    const batch = novedades.slice(i, i + batchSize);

    const { error } = await supabase.from("cad_novedades").insert(batch);

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${novedades.length}`);
  }

  console.log("Importación de NOVEDADES_OPERATIVAS completada.");
}

importarCadNovedades().catch((error) => {
  console.error(error);
  process.exit(1);
});