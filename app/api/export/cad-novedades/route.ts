import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const sheetName = "EXPORT_NOVEDADES_CAD";

function getEnv(nombre: string) {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta variable de entorno: ${nombre}`);
  }

  return valor;
}

async function obtenerNovedadesCad() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const pageSize = 1000;
  let desde = 0;
  let todas: any[] = [];

  while (true) {
    const hasta = desde + pageSize - 1;

    const { data, error } = await supabase
      .from("cad_novedades")
      .select(
        "id_novedad, fecha, hora, tipo_novedad, prioridad, distrito, circuito, subcircuito, id_puesto, cedula_reporta, nombre_reporta, descripcion, accion_tomada, estado_novedad, asignado_a, fecha_cierre, hora_cierre, evidencia_url, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
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

async function crearClienteSheets() {
  const credentialsPath = getEnv("GOOGLE_APPLICATION_CREDENTIALS");

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function asegurarHojaExiste(sheets: any, spreadsheetId: string) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const existe = metadata.data.sheets?.some(
    (sheet: any) => sheet.properties?.title === sheetName
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

function convertirAFilas(novedades: any[]) {
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

export async function POST() {
  try {
    const spreadsheetId = getEnv("GOOGLE_CAD_SHEET_ID");
    const sheets = await crearClienteSheets();
    const novedades = await obtenerNovedadesCad();

    await asegurarHojaExiste(sheets, spreadsheetId);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: convertirAFilas(novedades),
      },
    });

    return NextResponse.json({
      ok: true,
      total: novedades.length,
      hoja: sheetName,
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