"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [validando, setValidando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState("");

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

  async function sincronizarDatosMaestros() {
    const confirmar = window.confirm(
      "¿Deseas sincronizar datos maestros desde Google Sheets? Esto actualizará NOMINA, ausentismos, condiciones especiales, puestos y ciclos."
    );

    if (!confirmar) return;

    setSincronizando(true);
    setMensajeSync("");

    try {
      const response = await fetch("/api/sync/google-sheets", {
        method: "POST",
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.ok) {
        setMensajeSync(
          `Error sincronizando datos maestros: ${
            resultado.error ?? "Error desconocido"
          }`
        );
        return;
      }

      setMensajeSync("Sincronización completa finalizada correctamente.");
    } catch (error) {
      setMensajeSync(
        error instanceof Error
          ? `Error sincronizando datos maestros: ${error.message}`
          : "Error sincronizando datos maestros."
      );
    } finally {
      setSincronizando(false);
    }
  }

  if (validando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Validando sesión...</p>
      </main>
    );
  }

  const modulos = [
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
  "Consulta agente",
  "Portal público para que el agente consulte su información, corrida laboral, asignación publicada y reportes.",
  "/consulta",
],
[
  "Publicar distributivo",
  "Habilita la consulta pública de la distribución operativa para una fecha publicada.",
  "/asignacion/publicacion",
],
[
  "Reportes agente",
  "Revisión administrativa de novedades y solicitudes enviadas desde el Portal del Agente.",
  "/asignacion/reportes-agente",
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
  "Consulta agente",
  "Consulta individual de asignación con aceptación previa de disposiciones.",
  "/consulta",
],
    [
      "Ciclos",
      "Cronograma base, turnos y ciclos de trabajo operativo.",
      "/ciclos",
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
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              CACM-G
            </p>

            <h1 className="mt-4 text-3xl font-bold">Panel operativo</h1>

            <p className="mt-3 text-slate-400">
              Módulos principales para la gestión del Portal del Agente.
            </p>
          </div>

          <button
            type="button"
            onClick={sincronizarDatosMaestros}
            disabled={sincronizando}
            className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sincronizando
              ? "Sincronizando..."
              : "Sincronizar datos maestros"}
          </button>
        </div>

        {mensajeSync ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensajeSync}
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modulos.map(([titulo, descripcion, href]) => (
            <a
              key={titulo}
              href={href}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500 hover:bg-slate-800"
            >
              <h2 className="text-lg font-semibold text-cyan-300">
                {titulo}
              </h2>

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