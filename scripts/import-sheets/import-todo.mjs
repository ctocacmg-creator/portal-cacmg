import { spawn } from "node:child_process";

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

function ejecutarScript(script) {
  return new Promise((resolve, reject) => {
    console.log("");
    console.log("==================================================");
    console.log(`▶ ${script.nombre}`);
    console.log(`Archivo: ${script.archivo}`);
    console.log("==================================================");

    const proceso = spawn("node", [script.archivo], {
      stdio: "inherit",
      shell: true,
    });

    proceso.on("close", (codigo) => {
      if (codigo === 0) {
        console.log(`✅ Completado: ${script.nombre}`);
        resolve();
      } else {
        reject(
          new Error(
            `❌ Falló: ${script.nombre}. Código de salida: ${codigo}`
          )
        );
      }
    });

    proceso.on("error", (error) => {
      reject(error);
    });
  });
}

async function importarTodo() {
  console.log("Iniciando sincronización completa desde Google Sheets...");

  for (const script of scripts) {
    await ejecutarScript(script);
  }

  console.log("");
  console.log("==================================================");
  console.log("✅ Sincronización completa finalizada correctamente.");
  console.log("==================================================");
}

importarTodo().catch((error) => {
  console.error("");
  console.error("==================================================");
  console.error("❌ Error en sincronización completa");
  console.error(error);
  console.error("==================================================");
  process.exit(1);
});
