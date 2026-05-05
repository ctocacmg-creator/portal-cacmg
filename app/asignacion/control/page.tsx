"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AlertaAsignacion = {
  tipo_alerta: string;
  cedula: string | null;
  id_puesto: string | null;
  estado_asignacion: string | null;
  detalle: string;
};

export default function ControlAsignacionesPage() {
  const [alertas, setAlertas] = useState<AlertaAsignacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    async function cargarAlertas() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todas: AlertaAsignacion[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("v_control_asignaciones")
          .select("tipo_alerta, cedula, id_puesto, estado_asignacion, detalle")
          .order("tipo_alerta", { ascending: true })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar control: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todas = [...todas, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setAlertas(todas);
      setCargando(false);
    }

    cargarAlertas();
  }, []);

  const resumen = alertas.reduce<Record<string, number>>((acc, alerta) => {
    acc[alerta.tipo_alerta] = (acc[alerta.tipo_alerta] ?? 0) + 1;
    return acc;
  }, {});

  const alertasFiltradas = alertas.filter((alerta) =>
    alerta.tipo_alerta.toLowerCase().includes(filtroTipo.toLowerCase().trim())
  );

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando control de asignaciones...</p>
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
              Control de asignaciones
            </h1>

            <p className="mt-3 text-slate-400">
              Alertas de calidad de datos, déficit, sobrecupo y duplicados.
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

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {Object.entries(resumen).length === 0 ? (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5 md:col-span-5">
              <p className="text-sm text-emerald-300">
                No se detectaron alertas de control.
              </p>
            </div>
          ) : (
            Object.entries(resumen).map(([tipo, total]) => (
              <div
                key={tipo}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {tipo}
                </p>
                <p className="mt-2 text-3xl font-bold text-cyan-300">
                  {total}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="text-sm font-medium text-slate-300">
            Filtrar por tipo de alerta
          </label>
          <input
            value={filtroTipo}
            onChange={(event) => setFiltroTipo(event.target.value)}
            placeholder="Ej: SIN_PERSONA, SIN_PUESTO, DEFICIT"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Alertas detectadas
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {alertasFiltradas.length} de {alertas.length}
            </p>
          </div>

          {alertasFiltradas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay alertas para el filtro seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Detalle</th>
                  </tr>
                </thead>

                <tbody>
                  {alertasFiltradas.map((alerta, index) => (
                    <tr
                      key={`${alerta.tipo_alerta}-${alerta.cedula}-${alerta.id_puesto}-${index}`}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium text-cyan-300">
                        {alerta.tipo_alerta}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {alerta.cedula ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {alerta.id_puesto ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {alerta.estado_asignacion ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {alerta.detalle}
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