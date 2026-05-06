"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PropuestaAsignacion = {
  id: string;
  fecha: string;
  estado: string;
  total_registros: number | null;
  observacion: string | null;
  aplicado_at: string | null;
  created_at: string;
  updated_at: string | null;
};

function claseEstado(estado: string | null) {
  if (estado === "BORRADOR") {
    return "bg-amber-400/10 text-amber-300";
  }

  if (estado === "APLICADO") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  return "bg-slate-400/10 text-slate-300";
}

export default function PropuestasAsignacionPage() {
  const [propuestas, setPropuestas] = useState<PropuestaAsignacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    async function cargarPropuestas() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("propuestas_asignacion")
        .select(
          "id, fecha, estado, total_registros, observacion, aplicado_at, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setMensaje(`Error al cargar propuestas: ${error.message}`);
        setCargando(false);
        return;
      }

      setPropuestas((data ?? []) as PropuestaAsignacion[]);
      setCargando(false);
    }

    cargarPropuestas();
  }, []);

  const propuestasFiltradas = propuestas.filter((propuesta) => {
    const texto = [
      propuesta.id,
      propuesta.fecha,
      propuesta.estado,
      propuesta.observacion,
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(filtro.toLowerCase().trim());
  });

  const totalBorradores = propuestas.filter(
    (propuesta) => propuesta.estado === "BORRADOR"
  ).length;

  const totalAplicadas = propuestas.filter(
    (propuesta) => propuesta.estado === "APLICADO"
  ).length;

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando propuestas guardadas...</p>
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
              Propuestas de asignación
            </h1>

            <p className="mt-3 text-slate-400">
              Consulta borradores y propuestas aplicadas de distribución de
              personal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/asignacion/propuesta"
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Nueva propuesta
            </a>

            <a
              href="/asignacion"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a asignación
            </a>
          </div>
        </div>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total propuestas</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {propuestas.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Borradores</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">
              {totalBorradores}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Aplicadas</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {totalAplicadas}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="text-sm font-medium text-slate-300">
            Buscar propuesta
          </label>

          <input
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Buscar por fecha, estado, observación o ID"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Historial de propuestas
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Total: {propuestasFiltradas.length} de {propuestas.length}
            </p>
          </div>

          {propuestasFiltradas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay propuestas guardadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Registros</th>
                    <th className="px-4 py-3">Observación</th>
                    <th className="px-4 py-3">Creada</th>
                    <th className="px-4 py-3">Aplicada</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {propuestasFiltradas.map((propuesta) => (
                    <tr key={propuesta.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${claseEstado(
                            propuesta.estado
                          )}`}
                        >
                          {propuesta.estado}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.fecha}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.total_registros ?? 0}
                      </td>

                      <td className="max-w-md px-4 py-3 text-slate-300">
                        {propuesta.observacion ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {new Date(propuesta.created_at).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.aplicado_at
                          ? new Date(propuesta.aplicado_at).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-4 py-3">
                        {propuesta.estado === "BORRADOR" ? (
                          <a
                            href={`/asignacion/propuesta?borrador=${propuesta.id}`}
                            className="rounded-xl border border-cyan-700 px-3 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:text-cyan-200"
                          >
                            Abrir
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Aplicada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}