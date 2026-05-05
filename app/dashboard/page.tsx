"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [validando, setValidando] = useState(true);

  useEffect(() => {
    async function verificarSesion() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        window.location.href = "/login";
        return;
      }

      setValidando(false);
    }

    verificarSesion();
  }, []);

  if (validando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Validando sesión...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
          CACM-G
        </p>

        <h1 className="mt-4 text-3xl font-bold">Panel operativo</h1>

        <p className="mt-3 text-slate-400">
          Módulos principales para la gestión del Portal del Agente.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
  [
    "Personal",
    "Nómina, ficha del agente, ausentismos y condiciones especiales.",
    "/personal",
  ],
  [
    "Puestos",
    "Catálogo de puestos operativos por distrito y servicios especiales.",
    "/puestos",
  ],
  [
    "Asignación",
    "Distribución operativa por puestos, distritos, grupos y fechas.",
    "/asignacion",
  ],
[
  "CAD",
  "Novedades operativas, bitácora, apoyos y estado en tiempo real.",
  "/cad",
],
  [
    "Asignaciones activas",
    "Consulta del personal actualmente asignado a puestos operativos.",
    "/asignacion/activas",
  ],
  [
    "Auditoría",
    "Trazabilidad de acciones, usuarios y cambios relevantes.",
    "/auditoria",
  ],
  [
    "Reportes",
    "Indicadores, exportaciones y reportes operativos.",
    "#",
  ],
].map(([titulo, descripcion, href]) => (
  <a
    key={titulo}
    href={href}
    className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500 hover:bg-slate-800"
  >
    <h2 className="text-lg font-semibold text-cyan-300">{titulo}</h2>
    <p className="mt-3 text-sm leading-6 text-slate-400">
      {descripcion}
    </p>
  </a>
))}
        </div>
      </section>
    </main>
  );
}