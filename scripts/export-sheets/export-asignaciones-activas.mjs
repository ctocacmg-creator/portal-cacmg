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
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const sheetName = "EXPORT_ASIGNACIONES_ACTIVAS";

async function obtenerAsignacionesActivas() {
  const pageSize = 1000;
  let desde = 0;
  let todas = [];

  while (true) {
    const hasta = desde + pageSize - 1;

    const { data, error } = await supabase
      .from("v_asignaciones_activas")
      .select(
        "cedula, nombres, grado, id_puesto, distrito, circuito, subcircuito, grupo, area, funcion, horario, fecha_inicio, estado_asignacion, created_at"
      )
      .order("distrito", { ascending: true })
      .order("id_puesto", { ascending: true })
      .range(desde, hasta);

    if (error) {
      throw error;
    }

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

function convertirAFilas(asignaciones) {
  const headers = [
    "CEDULA",
    "NOMBRES",
    "GRADO",
    "ID_PUESTO",
    "DISTRITO",
    "CIRCUITO",
    "SUBCIRCUITO",
    "GRUPO",
    "AREA",
    "FUNCION",
    "HORARIO",
    "FECHA_INICIO",
    "ESTADO_ASIGNACION",
    "CREATED_AT",
  ];

  const rows = asignaciones.map((asignacion) => [
    asignacion.cedula ?? "",
    asignacion.nombres ?? "",
    asignacion.grado ?? "",
    asignacion.id_puesto ?? "",
    asignacion.distrito ?? "",
    asignacion.circuito ?? "",
    asignacion.subcircuito ?? "",
    asignacion.grupo ?? "",
    asignacion.area ?? "",
    asignacion.funcion ?? "",
    asignacion.horario ?? "",
    asignacion.fecha_inicio ?? "",
    asignacion.estado_asignacion ?? "",
    asignacion.created_at ?? "",
  ]);

  return [headers, ...rows];
}

async function exportarAsignacionesActivas() {
  console.log("Obteniendo asignaciones activas desde Supabase...");
  const asignaciones = await obtenerAsignacionesActivas();

  console.log(`Asignaciones activas encontradas: ${asignaciones.length}`);

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
      values: convertirAFilas(asignaciones),
    },
  });

  console.log(`Exportación completada en hoja ${sheetName}.`);
}

exportarAsignacionesActivas().catch((error) => {
  console.error(error);
  process.exit(1);
});