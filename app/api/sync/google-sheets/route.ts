import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const scripts = [
  {
    nombre: "Importar nómina/personas desde NOMINA",
    archivo: "scripts/import-sheets/import-nomina.mjs",
  },
  {
    nombre: "Importar ausentismos",
    archivo: "scripts/import-sheets/import-ausentismos.mjs",
  },
  {
    nombre: "Importar condiciones especiales",
    archivo: "scripts/import-sheets/import-condiciones-especiales.mjs",
  },
  {
    nombre: "Importar puestos desde ASIGNACION",
    archivo: "scripts/import-sheets/import-puestos.mjs",
  },
  {
    nombre: "Importar ciclos",
    archivo: "scripts/import-sheets/import-ciclos.mjs",
  },
];

function ejecutarScript(script: { nombre: string; archivo: string }) {
  return new Promise<{ nombre: string; ok: boolean }>((resolve, reject) => {
    const proceso = spawn("node", [script.archivo], {
      shell: true,
      cwd: process.cwd(),
      env: process.env,
    });

    let salida = "";
    let errorSalida = "";

    proceso.stdout.on("data", (data) => {
      salida += data.toString();
    });

    proceso.stderr.on("data", (data) => {
      errorSalida += data.toString();
    });

    proceso.on("close", (codigo) => {
      if (codigo === 0) {
        resolve({
          nombre: script.nombre,
          ok: true,
        });
      } else {
        reject(
          new Error(
            `Falló ${script.nombre}. Código: ${codigo}. Error: ${
              errorSalida || salida || "Sin detalle"
            }`
          )
        );
      }
    });

    proceso.on("error", (error) => {
      reject(error);
    });
  });
}

export async function POST() {
  try {
    const resultados = [];

    for (const script of scripts) {
      const resultado = await ejecutarScript(script);
      resultados.push(resultado);
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Sincronización completa finalizada correctamente.",
      resultados,
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