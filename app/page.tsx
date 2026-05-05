export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            CACM-G
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Portal del Agente
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Sistema operativo para gestión de personal, asignación de servicio,
            CAD, novedades, auditoría y reportes.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-semibold text-cyan-300">Personal</h2>
              <p className="mt-2 text-sm text-slate-400">
                Nómina, ausentismos y condiciones especiales.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-semibold text-cyan-300">Asignación</h2>
              <p className="mt-2 text-sm text-slate-400">
                Distribución operativa por puestos, distritos y grupos.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="font-semibold text-cyan-300">CAD</h2>
              <p className="mt-2 text-sm text-slate-400">
                Novedades, bitácora, apoyos e historial operativo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}