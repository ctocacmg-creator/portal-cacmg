import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config({ path: ".env.local" });

const spreadsheetId = process.env.GOOGLE_ASIGNACION_SHEET_ID;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!spreadsheetId || !credentialsPath) {
  throw new Error(
    "Faltan GOOGLE_ASIGNACION_SHEET_ID o GOOGLE_APPLICATION_CREDENTIALS en .env.local"
  );
}

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

async function listarHojas() {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const hojas = response.data.sheets ?? [];

  console.log("Hojas encontradas en ASIGNACION:");
  for (const hoja of hojas) {
    console.log(`- ${hoja.properties.title}`);
  }
}

listarHojas().catch((error) => {
  console.error(error);
  process.exit(1);
});