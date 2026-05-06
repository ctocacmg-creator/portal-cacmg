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
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const sheetName = "EXPORT_NOVEDADES_CAD";

async function obtenerNovedadesCad() {
  const pageSize = 1000;
  let desde = 0;
  let todas = [];

  while (true) {
    const hasta = desde + pageSize - 1;

    const { data, error } = await supabase
      .from("cad_novedades")
      .select(
        "id_novedad, fecha, hora, tipo_novedad, prioridad, distrito, circuito, subcircuito, id_puesto, cedula_reporta, nombre_reporta, descripcion, accion_tomada, estado_novedad, asignado_a, fecha_cierre, hora_cierre, evidencia_url, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .range(desde, hasta);

    if (error) throw error;

    const lote = data ?? [];
    todas = [...todas, ...lote];

    if (lote.length < pageSize) break;

    desde += pageSize;
  }

  return todas;
}

async function asegurarHojaExiste() {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const existe = metadata.data.sheets?.some(
    (sheet) => sheet.properties?.title === sheetName
  );

  if (existe) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });

  console.log(`Hoja creada: ${sheetName}`);
}

function convertirAFilas(novedades) {
  const headers = [
    "ID_NOVEDAD",
    "FECHA",
    "HORA",
    "TIPO_NOVEDAD",
    "PRIORIDAD",
    "DISTRITO",
    "CIRCUITO",
    "SUBCIRCUITO",
    "ID_PUESTO",
    "CEDULA_REPORTA",
    "NOMBRE_REPORTA",
    "DESCRIPCION",
    "ACCION_TOMADA",
    "ESTADO_NOVEDAD",
    "ASIGNADO_A",
    "FECHA_CIERRE",
    "HORA_CIERRE",
    "EVIDENCIA_URL",
    "CREATED_AT",
    "UPDATED_AT",
  ];

  const rows = novedades.map((novedad) => [
    novedad.id_novedad ?? "",
    novedad.fecha ?? "",
    novedad.hora ?? "",
    novedad.tipo_novedad ?? "",
    novedad.prioridad ?? "",
    novedad.distrito ?? "",
    novedad.circuito ?? "",
    novedad.subcircuito ?? "",
    novedad.id_puesto ?? "",
    novedad.cedula_reporta ?? "",
    novedad.nombre_reporta ?? "",
    novedad.descripcion ?? "",
    novedad.accion_tomada ?? "",
    novedad.estado_novedad ?? "",
    novedad.asignado_a ?? "",
    novedad.fecha_cierre ?? "",
    novedad.hora_cierre ?? "",
    novedad.evidencia_url ?? "",
    novedad.created_at ?? "",
    novedad.updated_at ?? "",
  ]);

  return [headers, ...rows];
}

async function exportarNovedadesCad() {
  console.log("Obteniendo novedades CAD desde Supabase...");
  const novedades = await obtenerNovedadesCad();

  console.log(`Novedades CAD encontradas: ${novedades.length}`);

  await asegurarHojaExiste();

  console.log("Limpiando hoja destino...");
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  console.log("Escribiendo datos en Google Sheets...");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: convertirAFilas(novedades),
    },
  });

  console.log(`Exportación completada en hoja ${sheetName}.`);
}

exportarNovedadesCad().catch((error) => {
  console.error(error);
  process.exit(1);
});