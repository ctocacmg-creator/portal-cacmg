import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const sheetName = "EXPORT_ASIGNACIONES_ACTIVAS";

function getEnv(nombre: string) {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta variable de entorno: ${nombre}`);
  }

  return valor;
}

async function obtenerAsignacionesActivas() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const pageSize = 1000;
  let desde = 0;
  let todas: any[] = [];

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

function convertirAFilas(asignaciones: any[]) {
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

export async function POST() {
  try {
    const spreadsheetId = getEnv("GOOGLE_ASIGNACION_SHEET_ID");
    const sheets = await crearClienteSheets();
    const asignaciones = await obtenerAsignacionesActivas();

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
        values: convertirAFilas(asignaciones),
      },
    });

    return NextResponse.json({
      ok: true,
      total: asignaciones.length,
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