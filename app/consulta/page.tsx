"use client";

import { useMemo, useState } from "react";

const VERSION_DOCUMENTO = "DISPOSICIONES_CONSULTA_V1_2026";

type AgenteConsulta = {
  cedula: string;
  nombres: string | null;
  grupo: string | null;
  area: string | null;
};

type AsignacionConsulta = {
  cedula: string;
  grupo: string | null;
  area: string | null;
  id_puesto: string;
  funcion: string | null;
  horario: string | null;
  observacion: string | null;
  fecha_inicio: string;
  estado_asignacion: string;
  created_at: string;
};

type ResultadoConsulta = {
  agente: AgenteConsulta;
  asignacion: AsignacionConsulta | null;
  mensaje: string;
};

function generarNumeroCaptcha() {
  return Math.floor(Math.random() * 8) + 2;
}

export default function ConsultaAgentePage() {
  const [cedula, setCedula] = useState("");
  const [codigoValidacion, setCodigoValidacion] = useState("");
  const [aceptaDisposiciones, setAceptaDisposiciones] = useState(false);
  const [captchaRespuesta, setCaptchaRespuesta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);

  const captcha = useMemo(
    () => ({
      a: generarNumeroCaptcha(),
      b: generarNumeroCaptcha(),
    }),
    []
  );

  const puedeConsultar =
    cedula.replace(/\D/g, "").trim().length >= 8 &&
    codigoValidacion.trim().length > 0 &&
    captchaRespuesta.trim().length > 0 &&
    aceptaDisposiciones &&
    !consultando;

  async function consultarAsignacion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setConsultando(true);
    setMensaje("");
    setResultado(null);

    try {
      const response = await fetch("/api/consulta-agente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cedula,
          codigoValidacion,
          aceptaDisposiciones,
          captchaA: captcha.a,
          captchaB: captcha.b,
          captchaRespuesta,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensaje(data.error ?? "No se pudo realizar la consulta.");
        return;
      }

      setResultado({
        agente: data.agente,
        asignacion: data.asignacion,
        mensaje: data.mensaje,
      });

      setMensaje(data.mensaje ?? "Consulta realizada correctamente.");
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Error inesperado realizando consulta."
      );
    } finally {
      setConsultando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            CACM-G
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Consulta de asignación del agente
          </h1>

          <p className="mt-3 text-slate-400">
            Ingresa tu cédula y código de validación para consultar tu
            distribución operativa vigente.
          </p>
        </div>

        <form
          onSubmit={consultarAsignacion}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
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

            <div>
              <label className="text-sm font-medium text-slate-300">
                Código de validación
              </label>

              <input
                type="password"
                value={codigoValidacion}
                onChange={(event) => setCodigoValidacion(event.target.value)}
                placeholder="Código registrado en NOMINA"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/20 p-5">
            <h2 className="font-semibold text-amber-300">
              Disposiciones generales del servicio
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
                checked={aceptaDisposiciones}
                onChange={(event) =>
                  setAceptaDisposiciones(event.target.checked)
                }
                className="mt-1"
              />

              <span>
                He leído y acepto las disposiciones generales del servicio,
                normas internas, lineamientos de uso del sistema y
                responsabilidad sobre el manejo de información.
              </span>
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <label className="text-sm font-medium text-slate-300">
              Validación anti-bot
            </label>

            <p className="mt-2 text-sm text-slate-400">
              Responde: {captcha.a} + {captcha.b} =
            </p>

            <input
              value={captchaRespuesta}
              onChange={(event) => setCaptchaRespuesta(event.target.value)}
              placeholder="Respuesta"
              className="mt-2 w-full max-w-xs rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={!puedeConsultar}
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
                Resultado de consulta
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Información disponible para el agente validado.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Cédula</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.agente.cedula}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Nombre</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.agente.nombres ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Grupo</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.agente.grupo ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Área</p>
                <p className="mt-1 font-semibold text-slate-300">
                  {resultado.agente.area ?? "-"}
                </p>
              </div>

              {resultado.asignacion ? (
                <>
                  <div>
                    <p className="text-xs text-slate-500">Puesto</p>
                    <p className="mt-1 font-semibold text-cyan-300">
                      {resultado.asignacion.id_puesto}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Función</p>
                    <p className="mt-1 font-semibold text-slate-300">
                      {resultado.asignacion.funcion ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Horario</p>
                    <p className="mt-1 font-semibold text-slate-300">
                      {resultado.asignacion.horario ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Fecha inicio</p>
                    <p className="mt-1 font-semibold text-slate-300">
                      {resultado.asignacion.fecha_inicio}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500">Observación</p>
                    <p className="mt-1 font-semibold text-slate-300">
                      {resultado.asignacion.observacion ?? "-"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-amber-200">
                  No tienes una asignación activa registrada.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}