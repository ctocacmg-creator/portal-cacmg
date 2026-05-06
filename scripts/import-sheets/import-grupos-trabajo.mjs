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
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

function normalizarTexto(valor) {
  return String(valor ?? "").trim();
}

function esGrupo(valor) {
  const texto = normalizarTexto(valor).toUpperCase();
  return /^G\d+$/i.test(texto);
}

async function obtenerCicloIdPorTipo(tipoCiclo) {
  const { data } = await supabase
    .from("ciclos_trabajo")
    .select("id")
    .or(`nombre_ciclo.eq.${tipoCiclo},tipo_ciclo.eq.${tipoCiclo}`)
    .maybeSingle();

  return data?.id ?? null;
}

async function importarGruposTrabajo() {
  const range = "'GRUPOS DE TRABAJO 12-2'!A1:Z200";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length === 0) {
    console.log("La hoja GRUPOS DE TRABAJO 12-2 no tiene datos.");
    return;
  }

  const gruposEncontrados = new Set();

  for (const row of rows) {
    for (const cell of row) {
      const valor = normalizarTexto(cell).toUpperCase();

      if (esGrupo(valor)) {
        gruposEncontrados.add(valor);
      }
    }
  }

  const gruposBase = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];

for (const grupo of gruposBase) {
  gruposEncontrados.add(grupo);
}

const gruposOrdenados = Array.from(gruposEncontrados).sort((a, b) => {
  const numeroA = Number(a.replace("G", ""));
  const numeroB = Number(b.replace("G", ""));
  return numeroA - numeroB;
});

  console.log("Grupos detectados:", gruposOrdenados);

  if (gruposOrdenados.length === 0) {
    console.log("No se detectaron grupos tipo G1, G2, G3...");
    return;
  }

  const tipoCiclo = "12-2";
  const cicloId = await obtenerCicloIdPorTipo(tipoCiclo);

  const grupos = gruposOrdenados.map((nombreGrupo) => ({
    nombre_grupo: nombreGrupo,
    ciclo_id: cicloId,
    tipo_ciclo: tipoCiclo,
    descripcion: "Grupo detectado desde hoja GRUPOS DE TRABAJO 12-2",
    estado: "ACTIVO",
  }));

  console.log(`Grupos preparados para importar: ${grupos.length}`);

  const { error: deleteError } = await supabase
    .from("grupos_trabajo")
    .delete()
    .eq("tipo_ciclo", tipoCiclo);

  if (deleteError) {
    console.error("Error limpiando grupos_trabajo:", deleteError);
    throw deleteError;
  }

  const { error } = await supabase.from("grupos_trabajo").insert(grupos);

  if (error) {
    console.error("Error importando grupos:", error);
    throw error;
  }

  console.log("Importación de GRUPOS DE TRABAJO 12-2 completada.");
}

importarGruposTrabajo().catch((error) => {
  console.error(error);
  process.exit(1);
});