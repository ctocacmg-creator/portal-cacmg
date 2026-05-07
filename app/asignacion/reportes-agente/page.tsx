"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ReporteAgente = {
  id: string;
  cedula: string;
  nombres: string | null;
  grupo: string | null;
  area: string | null;
  tipo_solicitud: string;
  detalle: string;
  prioridad: string;
  estado: string;
  fecha_reporte: string | null;
  origen: string | null;
  respuesta_admin: string | null;
  revisado_at: string | null;
  created_at: string;
};

const ESTADOS = ["PENDIENTE", "EN_REVISION", "RESUELTO", "RECHAZADO"];

function claseEstado(estado: string) {
  if (estado === "PENDIENTE") {
    return "border-amber-700 bg-amber-950/30 text-amber-300";
  }

  if (estado === "EN_REVISION") {
    return "border-cyan-700 bg-cyan-950/30 text-cyan-300";
  }

  if (estado === "RESUELTO") {
    return "border-emerald-700 bg-emerald-950/30 text-emerald-300";
  }

  if (estado === "RECHAZADO") {
    return "border-red-700 bg-red-950/30 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function clasePrioridad(prioridad: string) {
  if (prioridad === "URGENTE") {
    return "bg-red-400 text-slate-950";
  }

  if (prioridad === "ALTA") {
    return "bg-amber-400 text-slate-950";
  }

  if (prioridad === "MEDIA") {
    return "bg-cyan-400 text-slate-950";
  }

  return "bg-slate-600 text-white";
}

function formatearFechaHora(valor: string | null) {
  if (!valor) return "-";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

export default function ReportesAgentePage() {
  const [reportes, setReportes] = useState<ReporteAgente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");

  useEffect(() => {
    cargarReportes();
  }, []);

  async function cargarReportes() {
    setCargando(true);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("reportes_agente")
      .select(
        "id, cedula, nombres, grupo, area, tipo_solicitud, detalle, prioridad, estado, fecha_reporte, origen, respuesta_admin, revisado_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje(`Error cargando reportes: ${error.message}`);
      setCargando(false);
      return;
    }

    setReportes((data ?? []) as ReporteAgente[]);
    setCargando(false);
  }

  async function actualizarReporte(
    reporte: ReporteAgente,
    nuevoEstado: string,
    respuestaAdmin: string
  ) {
    setGuardandoId(reporte.id);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("reportes_agente")
      .update({
        estado: nuevoEstado,
        respuesta_admin: respuestaAdmin.trim() || null,
        revisado_por: sessionData.session.user.id,
        revisado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reporte.id);

    if (error) {
      setMensaje(`Error actualizando reporte: ${error.message}`);
      setGuardandoId("");
      return;
    }

    setReportes((actuales) =>
      actuales.map((item) =>
        item.id === reporte.id
          ? {
              ...item,
              estado: nuevoEstado,
              respuesta_admin: respuestaAdmin.trim() || null,
              revisado_at: new Date().toISOString(),
            }
          : item
      )
    );

    setMensaje("Reporte actualizado correctamente.");
    setGuardandoId("");
  }

  const reportesFiltrados = useMemo(() => {
    return reportes.filter((reporte) => {
      const texto = [
        reporte.cedula,
        reporte.nombres,
        reporte.grupo,
        reporte.area,
        reporte.tipo_solicitud,
        reporte.detalle,
        reporte.prioridad,
        reporte.estado,
        reporte.respuesta_admin,
      ]
        .join(" ")
        .toLowerCase();

      const coincideTexto = texto.includes(filtro.toLowerCase().trim());
      const coincideEstado =
        estadoFiltro === "TODOS" || reporte.estado === estadoFiltro;

      return coincideTexto && coincideEstado;
    });
  }, [reportes, filtro, estadoFiltro]);

  const resumen = useMemo(() => {
    return reportes.reduce<Record<string, number>>((acc, reporte) => {
      acc[reporte.estado] = (acc[reporte.estado] ?? 0) + 1;
      return acc;
    }, {});
  }, [reportes]);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando reportes...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              CACM-G
            </p>

            <h1 className="mt-4 text-3xl font-bold">
              Reportes del agente
            </h1>

            <p className="mt-3 text-slate-400">
              Revisión administrativa de novedades y solicitudes enviadas desde
              el Portal del Agente.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={cargarReportes}
              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-300 hover:border-cyan-400 hover:text-cyan-200"
            >
              Actualizar
            </button>

            <a
              href="/asignacion"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a asignación
            </a>
          </div>
        </div>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {["PENDIENTE", "EN_REVISION", "RESUELTO", "RECHAZADO"].map(
            (estado) => (
              <div
                key={estado}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{estado}</p>
                <p className="mt-2 text-3xl font-bold text-cyan-300">
                  {resumen[estado] ?? 0}
                </p>
              </div>
            )
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Buscar
              </label>

              <input
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                placeholder="Buscar por cédula, nombre, grupo, tipo, detalle o respuesta"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Estado
              </label>

              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="TODOS">Todos</option>
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {reportesFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-10 text-center text-slate-400">
              No hay reportes para mostrar.
            </div>
          ) : (
            reportesFiltrados.map((reporte) => (
              <ReporteCard
                key={reporte.id}
                reporte={reporte}
                guardando={guardandoId === reporte.id}
                onGuardar={actualizarReporte}
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function ReporteCard({
  reporte,
  guardando,
  onGuardar,
}: {
  reporte: ReporteAgente;
  guardando: boolean;
  onGuardar: (
    reporte: ReporteAgente,
    nuevoEstado: string,
    respuestaAdmin: string
  ) => Promise<void>;
}) {
  const [estado, setEstado] = useState(reporte.estado);
  const [respuesta, setRespuesta] = useState(reporte.respuesta_admin ?? "");

  useEffect(() => {
    setEstado(reporte.estado);
    setRespuesta(reporte.respuesta_admin ?? "");
  }, [reporte.estado, reporte.respuesta_admin]);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${claseEstado(
                reporte.estado
              )}`}
            >
              {reporte.estado}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${clasePrioridad(
                reporte.prioridad
              )}`}
            >
              {reporte.prioridad}
            </span>

            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
              {reporte.tipo_solicitud}
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-cyan-300">
            {reporte.nombres ?? "-"}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Cédula: {reporte.cedula} · Grupo: {reporte.grupo ?? "-"} · Área:{" "}
            {reporte.area ?? "-"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Enviado: {formatearFechaHora(reporte.created_at)}
          </p>
        </div>

        <div className="min-w-52">
          <label className="text-sm font-medium text-slate-300">
            Estado
          </label>

          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          >
            {ESTADOS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Detalle reportado
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {reporte.detalle}
        </p>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-slate-300">
          Respuesta administrativa
        </label>

        <textarea
          value={respuesta}
          onChange={(event) => setRespuesta(event.target.value)}
          placeholder="Registra la respuesta o acción tomada..."
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
        />
      </div>

      {reporte.revisado_at ? (
        <p className="mt-3 text-xs text-slate-500">
          Última revisión: {formatearFechaHora(reporte.revisado_at)}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => onGuardar(reporte, estado, respuesta)}
          disabled={guardando}
          className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? "Guardando..." : "Guardar revisión"}
        </button>
      </div>
    </article>
  );
}