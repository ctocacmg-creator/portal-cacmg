import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const spreadsheetId = process.env.GOOGLE_CICLOS_SHEET_ID;
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

const sheetName = "EXPORT_CICLOS";

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

async function obtenerCiclos() {
  const pageSize = 1000;
  let desde = 0;
  let todos = [];

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

function valorDia(diasPlan, dia) {
  return diasPlan?.[`dia_${dia}`] ?? "";
}

function convertirAFilas(ciclos) {
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

async function exportarCiclos() {
  console.log("Obteniendo ciclos desde Supabase...");
  const ciclos = await obtenerCiclos();

  console.log(`Ciclos encontrados: ${ciclos.length}`);

  await asegurarHojaExiste();

  console.log("Limpiando hoja destino...");
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:AZ`,
  });

  console.log("Escribiendo datos en Google Sheets...");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: convertirAFilas(ciclos),
    },
  });

  console.log(`Exportación completada en hoja ${sheetName}.`);
}

exportarCiclos().catch((error) => {
  console.error(error);
  process.exit(1);
});