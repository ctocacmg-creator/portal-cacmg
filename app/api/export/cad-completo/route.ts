import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getEnv(nombre: string) {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta variable de entorno: ${nombre}`);
  }

  return valor;
}

async function crearSupabaseAdmin() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

async function crearClienteSheets() {
  const credentialsPath = getEnv("GOOGLE_APPLICATION_CREDENTIALS");

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function asegurarHojaExiste(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string
) {
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
}

async function obtenerTodo(
  supabase: Awaited<ReturnType<typeof crearSupabaseAdmin>>,
  tabla: string,
  columnas: string,
  orden = "created_at"
) {
  const pageSize = 1000;
  let desde = 0;
  let todo: Record<string, unknown>[] = [];

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

async function escribirHoja(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string,
  values: unknown[][]
) {
  await asegurarHojaExiste(sheets, spreadsheetId, sheetName);

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
}

function filasBitacora(registros: Record<string, unknown>[]) {
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

function filasApoyos(registros: Record<string, unknown>[]) {
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

function filasEstado(registros: Record<string, unknown>[]) {
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

export async function POST() {
  try {
    const spreadsheetId = getEnv("GOOGLE_CAD_SHEET_ID");
    const supabase = await crearSupabaseAdmin();
    const sheets = await crearClienteSheets();

    const bitacora = await obtenerTodo(
      supabase,
      "cad_bitacora_novedades",
      "id, novedad_id, accion, estado_anterior, estado_nuevo, comentario, created_at"
    );

    await escribirHoja(
      sheets,
      spreadsheetId,
      "EXPORT_BITACORA_CAD",
      filasBitacora(bitacora)
    );

    const apoyos = await obtenerTodo(
      supabase,
      "cad_apoyos_novedades",
      "id, novedad_id, cedula, nombre, distrito, id_puesto_origen, id_puesto_destino, tipo_apoyo, estado_apoyo, observacion, fecha_cierre, hora_cierre, created_at, updated_at"
    );

    await escribirHoja(
      sheets,
      spreadsheetId,
      "EXPORT_APOYOS_CAD",
      filasApoyos(apoyos)
    );

    const estado = await obtenerTodo(
      supabase,
      "cad_estado_tiempo_real",
      "id, id_puesto, distrito, circuito, subcircuito, cedula, nombre, estado_operativo, ubicacion_referencial, ultima_actualizacion, observacion",
      "ultima_actualizacion"
    );

    await escribirHoja(
      sheets,
      spreadsheetId,
      "EXPORT_ESTADO_CAD",
      filasEstado(estado)
    );

    return NextResponse.json({
      ok: true,
      bitacora: bitacora.length,
      apoyos: apoyos.length,
      estado: estado.length,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}