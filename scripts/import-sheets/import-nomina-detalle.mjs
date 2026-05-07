import dotenv from "dotenv";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const SPREADSHEET_ID =
  process.env.GOOGLE_NOMINA_SHEET_ID ||
  process.env.GOOGLE_SHEETS_NOMINA_ID ||
  process.env.GOOGLE_SHEET_ID;

const SHEET_NAME = process.env.GOOGLE_SHEETS_NOMINA_HOJA || "NOMINA";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function limpiarCedula(valor) {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function buscarIndice(headers, nombresPosibles) {
  const normalizados = headers.map(normalizarTexto);

  for (const nombre of nombresPosibles) {
    const indice = normalizados.indexOf(normalizarTexto(nombre));

    if (indice >= 0) return indice;
  }

  return -1;
}

function valor(row, indices, nombreCampo) {
  const idx = indices[nombreCampo];

  if (idx === undefined || idx < 0) return null;

  const limpio = limpiarTexto(row[idx]);

  return limpio || null;
}

function crearIndices(headers) {
  const mapa = {
    usuario_sistema: ["USUARIO SISTEMA"],
    rol: ["ROL"],
    estado: ["ESTADO"],
    cedula: ["CEDULA", "CÉDULA"],
    nombres: ["APELLIDOS Y NOMBRES", "NOMBRES", "NOMBRE"],
    grado: ["GRADO"],
    grupo: ["GRUPO"],
    area: ["AREA", "ÁREA"],
    custodio_vehiculo: ["CUSTODIO DEL VEHICULO", "CUSTODIO DEL VEHÍCULO"],
    licencia_tipo_a: ["LICENCIA TIPO A"],
    licencia_tipo_a1: ["LICENCIA TIPO A1"],
    licencia_tipo_b: ["LICENCIA TIPO B"],
    licencia_tipo_c: ["LICENCIA TIPO C"],
    licencia_tipo_c1: ["LICENCIA TIPO C1"],
    licencia_tipo_d: ["LICENCIA TIPO D"],
    licencia_tipo_d1: ["LICENCIA TIPO D1"],
    licencia_tipo_e: ["LICENCIA TIPO E"],
    licencia_tipo_e1: ["LICENCIA TIPO E1"],
    licencia_tipo_f: ["LICENCIA TIPO F"],
    licencia_tipo_g: ["LICENCIA TIPO G"],
    fecha_ingreso: ["FECHA DE INGRESO"],
    fecha_nacimiento: ["FECHA DE NACIMIENTO"],
    genero: ["GENERO", "GÉNERO"],
    tipo_sangre: ["TIPO DE SANGRE"],
    numero_celular: ["NUMERO DE CELULAR", "NÚMERO DE CELULAR", "CELULAR"],
    correo_electronico: ["CORREO ELECTRONICO", "CORREO ELECTRÓNICO", "CORREO"],
    direccion_domiciliaria: ["DIRECCION DOMICILIARIA", "DIRECCIÓN DOMICILIARIA"],
    observacion: ["OBSERVACION", "OBSERVACIÓN"],
    ausentismo_por: ["AUSENTISMO POR"],
    ausentismo_desde: ["AUSENTISMO DESDE"],
    ausentismo_hasta: ["AUSENTISMO HASTA"],
    nota_ausentismo: ["NOTA AUSENTISMO"],
    fecha_asignacion: ["FECHA DE ASIGNACION", "FECHA DE ASIGNACIÓN"],
    asignacion_nomina: ["ASIGNACION DE CIRCUITO / PERIMETRO / SERVICIO", "ASIGNACIÓN DE CIRCUITO / PERÍMETRO / SERVICIO"],
    funcion_nomina: ["FUNCION", "FUNCIÓN"],
    horario_nomina: ["HORARIO"],
    lugar_formacion: ["LUGAR DE FORMACIÓN", "LUGAR DE FORMACION"],
    consignas: ["CONSIGNAS"],
    base_legal: ["BASE LEGAL"],
    encargado_jefe_inmediato: ["ENCARGADO O JEFE INMEDIATO"],
    codigo_validacion: ["CODIGO VALIDACION", "CÓDIGO VALIDACIÓN"],
    codigo_standby: ["CODIGO STANDBY", "CÓDIGO STANDBY"],
    parroquia_residencia: ["PARROQUIA"],
    sector_residencia: ["SECTOR"],
    criterio_observacion: ["CRITERIO / OBSERVACIÓN", "CRITERIO / OBSERVACION"],
    puede_ser_jp: ["PUEDE_SER_JP"],
    puede_ser_auxiliar: ["PUEDE_SER_AUXILIAR"],
    puede_ser_cp: ["PUEDE_SER_CP"],
    puede_conducir_camioneta: ["PUEDE_CONDUCIR_CAMIONETA"],
    puede_conducir_moto: ["PUEDE_CONDUCIR_MOTO"],
    tipo_licencia: ["TIPO_LICENCIA"],
    fecha_vencimiento_licencia: ["FECHA_VENCIMIENTO_LICENCIA"],
    licencia_vigente: ["LICENCIA_VIGENTE"],
    observacion_operativa: ["OBSERVACION_OPERATIVA", "OBSERVACIÓN_OPERATIVA"],
  };

  const indices = {};

  for (const [campo, nombres] of Object.entries(mapa)) {
    indices[campo] = buscarIndice(headers, nombres);
  }

  return indices;
}

async function crearAuthGoogle() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    throw new Error("Falta GOOGLE_APPLICATION_CREDENTIALS en .env.local");
  }

  return new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function main() {
  if (!SPREADSHEET_ID) {
    throw new Error("Falta GOOGLE_NOMINA_SHEET_ID o GOOGLE_SHEET_ID en .env.local");
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }

  const auth = await crearAuthGoogle();
  const sheets = google.sheets({ version: "v4", auth });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:ZZ`,
  });

  const rows = response.data.values ?? [];

  if (rows.length === 0) {
    throw new Error(`La hoja ${SHEET_NAME} no tiene filas.`);
  }

  const headers = rows[0];
  const indices = crearIndices(headers);

  console.log("Hoja usada:", SHEET_NAME);
  console.log("Encabezados encontrados:", headers);

  if (indices.cedula < 0) {
    throw new Error("No se encontró columna CEDULA.");
  }

  let actualizados = 0;
  let omitidos = 0;
  let sinCoincidencia = 0;

  const campos = Object.keys(indices).filter((campo) => campo !== "cedula");

  for (const row of rows.slice(1)) {
    const cedula = limpiarCedula(row[indices.cedula]);

    if (!cedula) {
      omitidos++;
      continue;
    }

    const payload = {};

    for (const campo of campos) {
      payload[campo] = valor(row, indices, campo);
    }

    if (payload.nombres) {
      payload.nombres = normalizarTexto(payload.nombres);
    }

    if (payload.grupo) {
      payload.grupo = normalizarTexto(payload.grupo);
    }

    if (payload.area) {
      payload.area = normalizarTexto(payload.area);
    }

    const { data, error } = await supabase
      .from("personas")
      .update(payload)
      .eq("cedula", cedula)
      .select("id");

    if (error) {
      console.error(`Error actualizando ${cedula}:`, error.message);
      omitidos++;
      continue;
    }

    if (!data || data.length === 0) {
      sinCoincidencia++;
      continue;
    }

    actualizados++;
  }

  console.log("Importación ampliada de NOMINA completada.");
  console.log("Actualizados:", actualizados);
  console.log("Omitidos:", omitidos);
  console.log("Sin coincidencia en personas:", sinCoincidencia);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});