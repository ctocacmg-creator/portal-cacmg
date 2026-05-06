"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ControlAsignacionCiclo = {
  asignacion_id: string;
  cedula: string | null;
  nombres: string | null;
  grupo: string | null;
  id_puesto: string | null;
  distrito: string | null;
  fecha_inicio: string | null;
  nombre_ciclo: string | null;
  anio: number | null;
  mes_numero: number | null;
  dia: number | null;
  estado_dia: string | null;
  estado_ciclo_normalizado: string | null;
  alerta: string | null;
};

function claseAlerta(alerta: string | null) {
  if (alerta === "OK") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (alerta === "ASIGNADO_EN_DESCANSO") {
    return "bg-red-400/10 text-red-300";
  }

  if (alerta === "SIN_CICLO" || alerta === "SIN_GRUPO") {
    return "bg-amber-400/10 text-amber-300";
  }

  return "bg-slate-400/10 text-slate-300";
}

export default function ControlAsignacionCiclosPage() {
  const [registros, setRegistros] = useState<ControlAsignacionCiclo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [filtroDistrito, setFiltroDistrito] = useState("");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    async function cargarControl() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todos: ControlAsignacionCiclo[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("v_control_asignacion_ciclos")
          .select(
            "asignacion_id, cedula, nombres, grupo, id_puesto, distrito, fecha_inicio, nombre_ciclo, anio, mes_numero, dia, estado_dia, estado_ciclo_normalizado, alerta"
          )
          .order("alerta", { ascending: true })
          .order("fecha_inicio", { ascending: false })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar control de ciclos: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todos = [...todos, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setRegistros(todos);
      setCargando(false);
    }

    cargarControl();
  }, []);

  async function exportarControl() {
    setExportando(true);
    setMensaje("");

    try {
      const response = await fetch("/api/export/control-asignacion-ciclos", {
        method: "POST",
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.ok) {
        setMensaje(
          `Error exportando control: ${
            resultado.error ?? "Error desconocido"
          }`
        );
        return;
      }

      setMensaje(
        `Exportación completada. Registros exportados: ${resultado.total}.`
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `Error exportando control: ${error.message}`
          : "Error exportando control."
      );
    } finally {
      setExportando(false);
    }
  }

  const resumen = registros.reduce<Record<string, number>>((acc, registro) => {
    const clave = registro.alerta ?? "SIN_ALERTA";
    acc[clave] = (acc[clave] ?? 0) + 1;
    return acc;
  }, {});

  const registrosFiltrados = registros.filter((registro) => {
    const coincideAlerta = (registro.alerta ?? "")
      .toLowerCase()
      .includes(filtroAlerta.toLowerCase().trim());

    const coincideGrupo = (registro.grupo ?? "")
      .toLowerCase()
      .includes(filtroGrupo.toLowerCase().trim());

    const coincideDistrito = (registro.distrito ?? "")
      .toLowerCase()
      .includes(filtroDistrito.toLowerCase().trim());

    return coincideAlerta && coincideGrupo && coincideDistrito;
  });

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">
          Cargando control de asignación contra ciclos...
        </p>
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
              Control asignación vs ciclos
            </h1>

            <p className="mt-3 text-slate-400">
              Detecta asignaciones activas realizadas en días de descanso, sin
              grupo o sin ciclo planificado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportarControl}
              disabled={exportando}
              className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportando ? "Exportando..." : "Exportar control"}
            </button>

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

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {Object.entries(resumen).length === 0 ? (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5 md:col-span-4">
              <p className="text-sm text-emerald-300">
                No hay asignaciones activas para controlar.
              </p>
            </div>
          ) : (
            Object.entries(resumen).map(([alerta, total]) => (
              <div
                key={alerta}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {alerta}
                </p>
                <p className="mt-2 text-3xl font-bold text-cyan-300">
                  {total}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por alerta
            </label>
            <input
              value={filtroAlerta}
              onChange={(event) => setFiltroAlerta(event.target.value)}
              placeholder="Ej: OK, DESCANSO, SIN_CICLO"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por grupo
            </label>
            <input
              value={filtroGrupo}
              onChange={(event) => setFiltroGrupo(event.target.value)}
              placeholder="Ej: G1, G2, G10"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por distrito
            </label>
            <input
              value={filtroDistrito}
              onChange={(event) => setFiltroDistrito(event.target.value)}
              placeholder="Ej: D1"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Resultado del control
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {registrosFiltrados.length} de {registros.length}
            </p>
          </div>

          {registrosFiltrados.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay registros para el filtro seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Alerta</th>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Ciclo</th>
                    <th className="px-4 py-3">Día</th>
                    <th className="px-4 py-3">Estado ciclo</th>
                  </tr>
                </thead>

                <tbody>
                  {registrosFiltrados.map((registro) => (
                    <tr
                      key={registro.asignacion_id}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${claseAlerta(
                            registro.alerta
                          )}`}
                        >
                          {registro.alerta ?? "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.cedula ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.nombres ?? "-"}
                      </td>

                      <td className="px-4 py-3 font-medium text-cyan-300">
                        {registro.grupo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.id_puesto ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.distrito ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.fecha_inicio ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.nombre_ciclo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.dia ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.estado_ciclo_normalizado ?? "-"}
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