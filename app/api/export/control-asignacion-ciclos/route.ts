import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const sheetName = "EXPORT_CONTROL_ASIGNACION_CICLOS";

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
  spreadsheetId: string
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

async function obtenerControl() {
  const supabase = await crearSupabaseAdmin();

  const pageSize = 1000;
  let desde = 0;
  let todos: Record<string, any>[] = [];

  while (true) {
    const hasta = desde + pageSize - 1;

    const { data, error } = await supabase
      .from("v_control_asignacion_ciclos")
      .select(
        "asignacion_id, cedula, nombres, grupo, id_puesto, distrito, fecha_inicio, nombre_ciclo, anio, mes_numero, dia, estado_dia, estado_ciclo_normalizado, alerta"
      )
      .order("alerta", { ascending: true })
      .order("fecha_inicio", { ascending: false })
      .range(desde, hasta);

    if (error) throw error;

    const lote = data ?? [];
    todos = [...todos, ...lote];

    if (lote.length < pageSize) break;

    desde += pageSize;
  }

  return todos;
}

function convertirAFilas(registros: Record<string, any>[]) {
  const headers = [
    "ASIGNACION_ID",
    "CEDULA",
    "NOMBRES",
    "GRUPO",
    "ID_PUESTO",
    "DISTRITO",
    "FECHA_INICIO",
    "NOMBRE_CICLO",
    "ANIO",
    "MES_NUMERO",
    "DIA",
    "ESTADO_DIA",
    "ESTADO_CICLO_NORMALIZADO",
    "ALERTA",
  ];

  const rows = registros.map((registro) => [
    registro.asignacion_id ?? "",
    registro.cedula ?? "",
    registro.nombres ?? "",
    registro.grupo ?? "",
    registro.id_puesto ?? "",
    registro.distrito ?? "",
    registro.fecha_inicio ?? "",
    registro.nombre_ciclo ?? "",
    registro.anio ?? "",
    registro.mes_numero ?? "",
    registro.dia ?? "",
    registro.estado_dia ?? "",
    registro.estado_ciclo_normalizado ?? "",
    registro.alerta ?? "",
  ]);

  return [headers, ...rows];
}

export async function POST() {
  try {
    const spreadsheetId = getEnv("GOOGLE_CICLOS_SHEET_ID");
    const sheets = await crearClienteSheets();
    const registros = await obtenerControl();

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
        values: convertirAFilas(registros),
      },
    });

    return NextResponse.json({
      ok: true,
      total: registros.length,
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