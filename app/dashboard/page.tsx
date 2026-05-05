export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
          CACM-G
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Panel operativo
        </h1>

        <p className="mt-3 text-slate-400">
          Módulos principales para la gestión del Portal del Agente.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            ["Personal", "Nómina, ficha del agente, ausentismos y condiciones especiales."],
            ["Asignación", "Distribución operativa por puestos, distritos, grupos y fechas."],
            ["CAD", "Novedades operativas, bitácora, apoyos e historial."],
            ["Auditoría", "Trazabilidad de acciones, usuarios y cambios relevantes."],
            ["Reportes", "Indicadores, exportaciones y reportes operativos."],
            ["Configuración", "Roles, permisos y parámetros del sistema."],
          ].map(([titulo, descripcion]) => (
            <div
              key={titulo}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-lg font-semibold text-cyan-300">{titulo}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {descripcion}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}