"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Persona = {
  id: string;
  cedula: string;
  nombres: string;
  grupo: string | null;
  area: string | null;
};

type ResultadoCiclo = {
  grupo: string;
  fecha: string;
  anio: number;
  mes_numero: number;
  dia: number;
  nombre_ciclo: string;
  estado_dia: string | null;
};

function normalizarEstadoCiclo(valor: string | null) {
  const texto = String(valor ?? "").toUpperCase().trim();

  if (texto === "X") return "TRABAJO";
  if (texto === "T") return "TRABAJO";
  if (texto === "D") return "DESCANSO";
  if (texto.includes("TRABAJO")) return "TRABAJO";
  if (texto.includes("DESCANSO")) return "DESCANSO";

  return texto || "SIN PLANIFICACIÓN";
}

function claseEstado(valor: string | null) {
  const estado = normalizarEstadoCiclo(valor);

  if (estado === "TRABAJO") {
    return "border-cyan-800 bg-cyan-950/40 text-cyan-300";
  }

  if (estado === "DESCANSO") {
    return "border-emerald-800 bg-emerald-950/40 text-emerald-300";
  }

  return "border-slate-800 bg-slate-950 text-slate-300";
}

export default function ValidarCicloAsignacionPage() {
  const [cedula, setCedula] = useState("");
  const [fecha, setFecha] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [resultado, setResultado] = useState<ResultadoCiclo | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [consultando, setConsultando] = useState(false);

  async function validarCiclo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cedulaLimpia = cedula.trim();

    if (!cedulaLimpia || !fecha) {
      setMensaje("Ingresa cédula y fecha para validar.");
      return;
    }

    setConsultando(true);
    setMensaje("");
    setPersona(null);
    setResultado(null);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { data: personaData, error: errorPersona } = await supabase
      .from("personas")
      .select("id, cedula, nombres, grupo, area")
      .eq("cedula", cedulaLimpia)
      .single<Persona>();

    if (errorPersona || !personaData) {
      setMensaje("No se encontró una persona con esa cédula.");
      setConsultando(false);
      return;
    }

    setPersona(personaData);

    if (!personaData.grupo) {
      setMensaje("La persona no tiene grupo registrado en nómina.");
      setConsultando(false);
      return;
    }

    const { data, error } = await supabase.rpc("fn_estado_grupo_en_fecha", {
      p_grupo: personaData.grupo,
      p_fecha: fecha,
    });

    if (error) {
      setMensaje(`Error validando ciclo: ${error.message}`);
      setConsultando(false);
      return;
    }

    const ciclo = (data?.[0] ?? null) as ResultadoCiclo | null;

    if (!ciclo) {
      setMensaje("No se encontró planificación para ese grupo y fecha.");
      setConsultando(false);
      return;
    }

    setResultado(ciclo);
    setMensaje("Consulta completada.");
    setConsultando(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              CACM-G
            </p>

            <h1 className="mt-4 text-3xl font-bold">
              Validar ciclo del agente
            </h1>

            <p className="mt-3 text-slate-400">
              Consulta rápida por cédula y fecha para validar si el grupo está
              en trabajo o descanso.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/asignacion"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a asignación
            </a>

            <a
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Dashboard
            </a>
          </div>
        </div>

        <form
          onSubmit={validarCiclo}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Cédula
              </label>
              <input
                required
                value={cedula}
                onChange={(event) => setCedula(event.target.value)}
                placeholder="Ej: 0102030405"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Fecha
              </label>
              <input
                required
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={consultando}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {consultando ? "Consultando..." : "Validar ciclo"}
          </button>
        </form>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        {persona ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold text-cyan-300">Datos del agente</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Cédula</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {persona.cedula}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">Nombre</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {persona.nombres}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Grupo</p>
                <p className="mt-1 font-semibold text-cyan-300">
                  {persona.grupo ?? "-"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {resultado ? (
          <div
            className={`mt-8 rounded-2xl border p-6 ${claseEstado(
              resultado.estado_dia
            )}`}
          >
            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
              Resultado del ciclo
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              {normalizarEstadoCiclo(resultado.estado_dia)}
            </h2>

            <div className="mt-5 grid gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="opacity-70">Grupo</p>
                <p className="mt-1 font-semibold">{resultado.grupo}</p>
              </div>

              <div>
                <p className="opacity-70">Fecha</p>
                <p className="mt-1 font-semibold">{resultado.fecha}</p>
              </div>

              <div>
                <p className="opacity-70">Día</p>
                <p className="mt-1 font-semibold">{resultado.dia}</p>
              </div>

              <div>
                <p className="opacity-70">Ciclo</p>
                <p className="mt-1 font-semibold">
                  {resultado.nombre_ciclo}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}