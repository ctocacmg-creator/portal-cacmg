"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const VERSION_DOCUMENTO = "DISPOSICIONES_CONSULTA_V1_2026";

type ResultadoConsulta = {
  cedula: string;
  nombres: string | null;
  grupo: string | null;
  area: string | null;
  id_puesto: string;
  funcion: string | null;
  horario: string | null;
  observacion: string | null;
  fecha_inicio: string;
  estado_asignacion: string;
  personas: {
    nombres: string | null;
  } | null;
};

export default function ConsultaAgentePage() {
  const [cedula, setCedula] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);

  async function consultarAsignacion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cedulaLimpia = cedula.replace(/\D/g, "").trim();

    if (!cedulaLimpia) {
      setMensaje("Ingresa tu número de cédula.");
      return;
    }

    if (!acepta) {
      setMensaje(
        "Debes aceptar las disposiciones institucionales antes de consultar."
      );
      return;
    }

    setConsultando(true);
    setMensaje("");
    setResultado(null);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { error: errorAceptacion } = await supabase
      .from("aceptaciones_consulta")
      .insert({
        cedula: cedulaLimpia,
        version_documento: VERSION_DOCUMENTO,
        aceptado: true,
        ip_origen: null,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      });

    if (errorAceptacion) {
      setMensaje(
        `Error registrando aceptación: ${errorAceptacion.message}`
      );
      setConsultando(false);
      return;
    }

    const { data, error } = await supabase
      .from("asignaciones")
      .select(
        "cedula, grupo, area, id_puesto, funcion, horario, observacion, fecha_inicio, estado_asignacion, personas(nombres)"
      )
      .eq("cedula", cedulaLimpia)
      .eq("estado_asignacion", "ACTIVO")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ResultadoConsulta>();

    if (error) {
      setMensaje(`Error consultando asignación: ${error.message}`);
      setConsultando(false);
      return;
    }

    if (!data) {
      setMensaje(
        "No se encontró una asignación activa para la cédula ingresada."
      );
      setConsultando(false);
      return;
    }

    setResultado(data);
    setMensaje("Consulta realizada correctamente.");
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
              Consulta de asignación
            </h1>

            <p className="mt-3 text-slate-400">
              Consulta tu distribución operativa vigente previa aceptación de
              las disposiciones institucionales.
            </p>
          </div>

          <a
            href="/login"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
          >
            Iniciar sesión
          </a>
        </div>

        <form
          onSubmit={consultarAsignacion}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        >
          <div>
            <label className="text-sm font-medium text-slate-300">
              Cédula
            </label>

            <input
              value={cedula}
              onChange={(event) => setCedula(event.target.value)}
              placeholder="Ingresa tu cédula"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/20 p-5">
            <h2 className="font-semibold text-amber-300">
              Disposiciones institucionales
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <p>
                Declaro que la información consultada corresponde
                exclusivamente a mi distribución operativa y que será utilizada
                únicamente para fines institucionales.
              </p>

              <p>
                Reconozco que la asignación puede estar sujeta a cambios por
                novedades operativas, permisos, reemplazos, emergencias o
                disposiciones superiores.
              </p>

              <p>
                Me comprometo a revisar oportunamente mi puesto, horario,
                función y observaciones, y a cumplir las disposiciones del
                Cuerpo de Agentes de Control Municipal de Guayaquil.
              </p>

              <p className="text-xs text-slate-500">
                Versión del documento: {VERSION_DOCUMENTO}
              </p>
            </div>

            <label className="mt-5 flex items-start gap-3 text-sm text-amber-200">
              <input
                type="checkbox"
                checked={acepta}
                onChange={(event) => setAcepta(event.target.checked)}
                className="mt-1"
              />

              <span>
                Acepto las disposiciones generales, normas internas,
                lineamientos de uso del sistema y responsabilidad sobre el
                manejo de información.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!acepta || consultando}
            className="mt-6 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {consultando ? "Consultando..." : "Consultar asignación"}
          </button>
        </form>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        {resultado ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold text-cyan-300">
                Asignación vigente
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Información operativa actual registrada en el sistema.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Cédula</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.cedula}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Nombre</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.personas?.nombres ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Puesto</p>
                <p className="mt-1 font-semibold text-cyan-300">
                  {resultado.id_puesto}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Grupo</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.grupo ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Área</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.area ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Función</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.funcion ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Horario</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.horario ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Fecha inicio</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.fecha_inicio}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">Observación</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.observacion ?? "-"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}