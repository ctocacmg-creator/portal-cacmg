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

const hojasDistritos = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"];

function normalizarTexto(valor) {
  return String(valor ?? "").trim();
}

function normalizarNumero(valor) {
  const numero = Number(String(valor ?? "").replace(",", ".").trim());
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarIdPuesto(valor) {
  return normalizarTexto(valor).toUpperCase();
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

async function importarHojaDistrito(nombreHoja) {
  const range = `${nombreHoja}!A:Z`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log(`Hoja ${nombreHoja}: sin datos suficientes.`);
    return [];
  }

  const headers = rows[0];

  const idxIdPuesto = buscarColumna(headers, [
    "ID_PUESTO",
    "ID PUESTO",
    "CODIGO PUESTO",
    "CÓDIGO PUESTO",
    "PUESTO",
  ]);

  const idxDistrito = buscarColumna(headers, ["DISTRITO"]);
  const idxCircuito = buscarColumna(headers, ["CIRCUITO"]);
  const idxSubcircuito = buscarColumna(headers, ["SUBCIRCUITO", "SUB CIRCUITO"]);
  const idxSector = buscarColumna(headers, ["SECTOR"]);
  const idxNumeroAcm = buscarColumna(headers, [
    "NUMERO_ACM",
    "NÚMERO ACM",
    "NUMERO ACM",
    "ACM",
    "NRO ACM",
    "N° ACM",
  ]);
  const idxEstado = buscarColumna(headers, ["ESTADO"]);

  if (idxIdPuesto === -1) {
    console.log(`Encabezados encontrados en ${nombreHoja}:`, headers);
    throw new Error(`No se encontró columna obligatoria ID_PUESTO en ${nombreHoja}.`);
  }

  const puestos = rows
    .slice(1)
    .map((row) => {
      const idPuesto = normalizarIdPuesto(row[idxIdPuesto]);

      return {
        id_puesto: idPuesto,
        distrito:
          idxDistrito >= 0 && normalizarTexto(row[idxDistrito])
            ? normalizarTexto(row[idxDistrito]).toUpperCase()
            : nombreHoja,
        circuito:
          idxCircuito >= 0 ? normalizarTexto(row[idxCircuito]).toUpperCase() : null,
        subcircuito:
          idxSubcircuito >= 0
            ? normalizarTexto(row[idxSubcircuito]).toUpperCase()
            : null,
        sector:
          idxSector >= 0 ? normalizarTexto(row[idxSector]).toUpperCase() : null,
        numero_acm: idxNumeroAcm >= 0 ? normalizarNumero(row[idxNumeroAcm]) : 0,
        estado:
          idxEstado >= 0 && normalizarTexto(row[idxEstado])
            ? normalizarTexto(row[idxEstado]).toUpperCase()
            : "ACTIVO",
      };
    })
    .filter((puesto) => puesto.id_puesto);

  console.log(`Hoja ${nombreHoja}: puestos preparados ${puestos.length}`);

  return puestos;
}

async function importarPuestos() {
  let todosLosPuestos = [];

  for (const hoja of hojasDistritos) {
    const puestosHoja = await importarHojaDistrito(hoja);
    todosLosPuestos = [...todosLosPuestos, ...puestosHoja];
  }

  const puestosUnicos = Array.from(
    new Map(todosLosPuestos.map((puesto) => [puesto.id_puesto, puesto])).values()
  );

  console.log(`Total puestos únicos preparados: ${puestosUnicos.length}`);

  const batchSize = 500;

  for (let i = 0; i < puestosUnicos.length; i += batchSize) {
    const batch = puestosUnicos.slice(i, i + batchSize);

    const { error } = await supabase
      .from("puestos_operativos")
      .upsert(batch, { onConflict: "id_puesto" });

    if (error) {
      console.error("Error en lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${puestosUnicos.length}`);
  }

  console.log("Importación de puestos operativos completada.");
}

importarPuestos().catch((error) => {
  console.error(error);
  process.exit(1);
});