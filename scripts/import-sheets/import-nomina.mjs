import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
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

function normalizarCedula(valor) {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

function buscarColumna(headers, posiblesNombres) {
  const normalizados = headers.map((header) =>
    normalizarTexto(header).toUpperCase()
  );

  for (const nombre of posiblesNombres) {
    const index = normalizados.indexOf(nombre.toUpperCase());
    if (index !== -1) return index;
  }

  return -1;
}

async function importarNomina() {
  const range = "NOMINA!A:Z";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja NOMINA no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxCedula = buscarColumna(headers, ["CEDULA", "CÉDULA"]);
  const idxNombres = buscarColumna(headers, [
    "NOMBRES",
    "NOMBRE",
    "APELLIDOS Y NOMBRES",
    "APELLIDOS_NOMBRES",
  ]);
  const idxGrado = buscarColumna(headers, ["GRADO"]);
  const idxGrupo = buscarColumna(headers, ["GRUPO"]);
  const idxArea = buscarColumna(headers, ["AREA", "ÁREA"]);
  const idxDistrito = buscarColumna(headers, ["DISTRITO"]);
  const idxEstado = buscarColumna(headers, ["ESTADO"]);

  if (idxCedula === -1 || idxNombres === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: CEDULA y NOMBRES."
    );
  }

  const personas = rows
    .slice(1)
    .map((row) => ({
      cedula: normalizarCedula(row[idxCedula]),
      nombres: normalizarTexto(row[idxNombres]).toUpperCase(),
      grado:
        idxGrado >= 0 ? normalizarTexto(row[idxGrado]).toUpperCase() : null,
      grupo:
        idxGrupo >= 0 ? normalizarTexto(row[idxGrupo]).toUpperCase() : null,
      area: idxArea >= 0 ? normalizarTexto(row[idxArea]).toUpperCase() : null,
      distrito:
        idxDistrito >= 0
          ? normalizarTexto(row[idxDistrito]).toUpperCase()
          : null,
      estado:
        idxEstado >= 0 && normalizarTexto(row[idxEstado])
          ? normalizarTexto(row[idxEstado]).toUpperCase()
          : "ACTIVO",
    }))
    .filter((persona) => persona.cedula && persona.nombres);

  console.log(`Personas preparadas para importar: ${personas.length}`);

  const batchSize = 500;

  for (let i = 0; i < personas.length; i += batchSize) {
    const batch = personas.slice(i, i + batchSize);

    const { error } = await supabase
      .from("personas")
      .upsert(batch, { onConflict: "cedula" });

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${personas.length}`);
  }

  console.log("Importación de NOMINA completada.");
}

importarNomina().catch((error) => {
  console.error(error);
  process.exit(1);
});