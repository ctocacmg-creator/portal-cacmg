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

function normalizarNumero(valor) {
  const numero = Number(String(valor ?? "").replace(",", ".").trim());
  return Number.isFinite(numero) ? numero : null;
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

function obtenerNumeroMes(mesTexto) {
  const texto = normalizarTexto(mesTexto).toUpperCase();

  const meses = {
    ENERO: 1,
    FEBRERO: 2,
    MARZO: 3,
    ABRIL: 4,
    MAYO: 5,
    JUNIO: 6,
    JULIO: 7,
    AGOSTO: 8,
    SEPTIEMBRE: 9,
    SETIEMBRE: 9,
    OCTUBRE: 10,
    NOVIEMBRE: 11,
    DICIEMBRE: 12,
  };

  for (const [nombre, numero] of Object.entries(meses)) {
    if (texto.includes(nombre)) {
      return numero;
    }
  }

  return null;
}

function obtenerAnio(mesTexto) {
  const texto = normalizarTexto(mesTexto);
  const match = texto.match(/\b(20\d{2})\b/);

  if (match) {
    return Number(match[1]);
  }

  return 2026;
}

function obtenerDiasDelMes(mesTexto) {
  const numeroMes = obtenerNumeroMes(mesTexto);
  const anio = obtenerAnio(mesTexto);

  if (!numeroMes) {
    return 31;
  }

  return new Date(anio, numeroMes, 0).getDate();
}

async function importarCiclos() {
  const range = "CICLOS!A:AZ";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values ?? [];

  if (rows.length < 2) {
    console.log("La hoja CICLOS no tiene datos suficientes.");
    return;
  }

  const headers = rows[0];

  const idxCiclo = buscarColumna(headers, ["CICLO"]);
  const idxMes = buscarColumna(headers, ["MES"]);
  const idxGrupo = buscarColumna(headers, ["GRUPO"]);

  const idxDiasTrabajo = buscarColumna(headers, [
    "DIAS TRABAJO",
    "DÍAS TRABAJO",
    "DIAS_TRABAJO",
    "DÍAS_TRABAJO",
  ]);

  const idxDiasDescanso = buscarColumna(headers, [
    "DIAS DESCANSO",
    "DÍAS DESCANSO",
    "DIAS_DESCANSO",
    "DÍAS_DESCANSO",
  ]);

  if (idxCiclo === -1 || idxMes === -1 || idxGrupo === -1) {
    console.log("Encabezados encontrados:", headers);
    throw new Error(
      "No se encontraron columnas obligatorias: CICLO, Mes, Grupo."
    );
  }

  const columnasDias = [];

  for (let dia = 1; dia <= 31; dia++) {
    const idxDia = buscarColumna(headers, [
      `DIA ${dia}`,
      `DÍA ${dia}`,
      `DIA_${dia}`,
      `DÍA_${dia}`,
    ]);

    if (idxDia >= 0) {
      columnasDias.push({
        dia,
        index: idxDia,
      });
    }
  }

  const ciclos = [];

  for (const row of rows.slice(1)) {
    const ciclo = normalizarTexto(row[idxCiclo]).toUpperCase();
    const mes = normalizarTexto(row[idxMes]).toUpperCase();
    const grupo = normalizarTexto(row[idxGrupo]).toUpperCase();

    if (!ciclo || !mes || !grupo) continue;

    const anio = obtenerAnio(mes);
    const mesNumero = obtenerNumeroMes(mes);
    const diasDelMes = obtenerDiasDelMes(mes);
    const diasPlan = {};

    for (const columna of columnasDias) {
      if (columna.dia > diasDelMes) continue;

      const valor = normalizarTexto(row[columna.index]).toUpperCase();

      if (valor) {
        diasPlan[`dia_${columna.dia}`] = valor;
      }
    }

    ciclos.push({
      nombre_ciclo: ciclo,
      tipo_ciclo: ciclo,
      anio,
      mes_numero: mesNumero,
      mes,
      grupo,
      dias_plan: diasPlan,
      dias_trabajo:
        idxDiasTrabajo >= 0 ? normalizarNumero(row[idxDiasTrabajo]) : null,
      dias_descanso:
        idxDiasDescanso >= 0 ? normalizarNumero(row[idxDiasDescanso]) : null,
      descripcion: `Ciclo ${ciclo} - ${mes} ${anio} - ${grupo}`,
      estado: "ACTIVO",
    });
  }

  console.log(`Ciclos preparados para importar: ${ciclos.length}`);

  if (ciclos.length === 0) {
    console.log("No hay ciclos válidos para importar.");
    return;
  }

  const { error: deleteError } = await supabase
    .from("ciclos_trabajo")
    .delete()
    .neq("nombre_ciclo", "__NO_EXISTE__");

  if (deleteError) {
    console.error("Error limpiando ciclos_trabajo:", deleteError);
    throw deleteError;
  }

  const batchSize = 500;

  for (let i = 0; i < ciclos.length; i += batchSize) {
    const batch = ciclos.slice(i, i + batchSize);

    const { error } = await supabase.from("ciclos_trabajo").insert(batch);

    if (error) {
      console.error("Error importando lote:", i, error);
      throw error;
    }

    console.log(`Lote importado: ${i + batch.length}/${ciclos.length}`);
  }

  console.log("Importación de CICLOS completada.");
}

importarCiclos().catch((error) => {
  console.error(error);
  process.exit(1);
});