import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const sheetName = "EXPORT_CICLOS";

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

async function obtenerCiclos() {
  const supabase = await crearSupabaseAdmin();

  const pageSize = 1000;
  let desde = 0;
  let todos: Record<string, any>[] = [];

  while (true) {
    const hasta = desde + pageSize - 1;

    const { data, error } = await supabase
      .from("ciclos_trabajo")
      .select(
        "nombre_ciclo, tipo_ciclo, anio, mes_numero, mes, grupo, dias_trabajo, dias_descanso, dias_plan, descripcion, estado, created_at, updated_at"
      )
      .order("anio", { ascending: true })
      .order("mes_numero", { ascending: true })
      .order("grupo", { ascending: true })
      .order("nombre_ciclo", { ascending: true })
      .range(desde, hasta);

    if (error) throw error;

    const lote = data ?? [];
    todos = [...todos, ...lote];

    if (lote.length < pageSize) break;

    desde += pageSize;
  }

  return todos;
}

function valorDia(diasPlan: Record<string, string> | null, dia: number) {
  return diasPlan?.[`dia_${dia}`] ?? "";
}

function convertirAFilas(ciclos: Record<string, any>[]) {
  const headers = [
    "CICLO",
    "TIPO_CICLO",
    "ANIO",
    "MES_NUMERO",
    "MES",
    "GRUPO",
    ...Array.from({ length: 31 }, (_, index) => `DIA ${index + 1}`),
    "DIAS_TRABAJO",
    "DIAS_DESCANSO",
    "DESCRIPCION",
    "ESTADO",
    "CREATED_AT",
    "UPDATED_AT",
  ];

  const rows = ciclos.map((ciclo) => [
    ciclo.nombre_ciclo ?? "",
    ciclo.tipo_ciclo ?? "",
    ciclo.anio ?? "",
    ciclo.mes_numero ?? "",
    ciclo.mes ?? "",
    ciclo.grupo ?? "",
    ...Array.from({ length: 31 }, (_, index) =>
      valorDia(ciclo.dias_plan, index + 1)
    ),
    ciclo.dias_trabajo ?? "",
    ciclo.dias_descanso ?? "",
    ciclo.descripcion ?? "",
    ciclo.estado ?? "",
    ciclo.created_at ?? "",
    ciclo.updated_at ?? "",
  ]);

  return [headers, ...rows];
}

export async function POST() {
  try {
    const spreadsheetId = getEnv("GOOGLE_CICLOS_SHEET_ID");
    const sheets = await crearClienteSheets();
    const ciclos = await obtenerCiclos();

    await asegurarHojaExiste(sheets, spreadsheetId);

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:AZ`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: convertirAFilas(ciclos),
      },
    });

    return NextResponse.json({
      ok: true,
      total: ciclos.length,
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