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

async function asegurarHojaExiste(sheetName) {
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

async function obtenerTodo(tabla, columnas, orden = "created_at") {
  const pageSize = 1000;
  let desde = 0;
  let todo = [];

  while (true) {
    const hasta = desde + pageSize - 1;

    const { data, error } = await supabase
      .from(tabla)
      .select(columnas)
      .order(orden, { ascending: false })
      .range(desde, hasta);

    if (error) throw error;

    const lote = data ?? [];
    todo = [...todo, ...lote];

    if (lote.length < pageSize) break;

    desde += pageSize;
  }

  return todo;
}

async function escribirHoja(sheetName, values) {
  await asegurarHojaExiste(sheetName);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

  console.log(`Exportado ${sheetName}: ${Math.max(values.length - 1, 0)} registros`);
}

function filasBitacora(registros) {
  const headers = [
    "ID",
    "NOVEDAD_ID",
    "ACCION",
    "ESTADO_ANTERIOR",
    "ESTADO_NUEVO",
    "COMENTARIO",
    "CREATED_AT",
  ];

  const rows = registros.map((registro) => [
    registro.id ?? "",
    registro.novedad_id ?? "",
    registro.accion ?? "",
    registro.estado_anterior ?? "",
    registro.estado_nuevo ?? "",
    registro.comentario ?? "",
    registro.created_at ?? "",
  ]);

  return [headers, ...rows];
}

function filasApoyos(registros) {
  const headers = [
    "ID",
    "NOVEDAD_ID",
    "CEDULA",
    "NOMBRE",
    "DISTRITO",
    "ID_PUESTO_ORIGEN",
    "ID_PUESTO_DESTINO",
    "TIPO_APOYO",
    "ESTADO_APOYO",
    "OBSERVACION",
    "FECHA_CIERRE",
    "HORA_CIERRE",
    "CREATED_AT",
    "UPDATED_AT",
  ];

  const rows = registros.map((registro) => [
    registro.id ?? "",
    registro.novedad_id ?? "",
    registro.cedula ?? "",
    registro.nombre ?? "",
    registro.distrito ?? "",
    registro.id_puesto_origen ?? "",
    registro.id_puesto_destino ?? "",
    registro.tipo_apoyo ?? "",
    registro.estado_apoyo ?? "",
    registro.observacion ?? "",
    registro.fecha_cierre ?? "",
    registro.hora_cierre ?? "",
    registro.created_at ?? "",
    registro.updated_at ?? "",
  ]);

  return [headers, ...rows];
}

function filasEstado(registros) {
  const headers = [
    "ID",
    "ID_PUESTO",
    "DISTRITO",
    "CIRCUITO",
    "SUBCIRCUITO",
    "CEDULA",
    "NOMBRE",
    "ESTADO_OPERATIVO",
    "UBICACION_REFERENCIAL",
    "ULTIMA_ACTUALIZACION",
    "OBSERVACION",
  ];

  const rows = registros.map((registro) => [
    registro.id ?? "",
    registro.id_puesto ?? "",
    registro.distrito ?? "",
    registro.circuito ?? "",
    registro.subcircuito ?? "",
    registro.cedula ?? "",
    registro.nombre ?? "",
    registro.estado_operativo ?? "",
    registro.ubicacion_referencial ?? "",
    registro.ultima_actualizacion ?? "",
    registro.observacion ?? "",
  ]);

  return [headers, ...rows];
}

async function exportarCadCompleto() {
  console.log("Exportando bitácora CAD...");
  const bitacora = await obtenerTodo(
    "cad_bitacora_novedades",
    "id, novedad_id, accion, estado_anterior, estado_nuevo, comentario, created_at"
  );
  await escribirHoja("EXPORT_BITACORA_CAD", filasBitacora(bitacora));

  console.log("Exportando apoyos CAD...");
  const apoyos = await obtenerTodo(
    "cad_apoyos_novedades",
    "id, novedad_id, cedula, nombre, distrito, id_puesto_origen, id_puesto_destino, tipo_apoyo, estado_apoyo, observacion, fecha_cierre, hora_cierre, created_at, updated_at"
  );
  await escribirHoja("EXPORT_APOYOS_CAD", filasApoyos(apoyos));

  console.log("Exportando estado CAD...");
  const estado = await obtenerTodo(
    "cad_estado_tiempo_real",
    "id, id_puesto, distrito, circuito, subcircuito, cedula, nombre, estado_operativo, ubicacion_referencial, ultima_actualizacion, observacion",
    "ultima_actualizacion"
  );
  await escribirHoja("EXPORT_ESTADO_CAD", filasEstado(estado));

  console.log("Exportación completa CAD finalizada.");
}

exportarCadCompleto().catch((error) => {
  console.error(error);
  process.exit(1);
});