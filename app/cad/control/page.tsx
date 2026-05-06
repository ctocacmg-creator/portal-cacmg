"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AlertaCad = {
  tipo_alerta: string;
  id: string | null;
  id_novedad: string | null;
  estado_novedad: string | null;
  distrito: string | null;
  id_puesto: string | null;
  detalle: string;
};

export default function ControlCadPage() {
  const [alertas, setAlertas] = useState<AlertaCad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDistrito, setFiltroDistrito] = useState("");

  useEffect(() => {
    async function cargarControlCad() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todas: AlertaCad[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("v_control_cad")
          .select(
            "tipo_alerta, id, id_novedad, estado_novedad, distrito, id_puesto, detalle"
          )
          .order("tipo_alerta", { ascending: true })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar control CAD: ${error.message}`);
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

    cargarControlCad();
  }, []);

  const resumen = alertas.reduce<Record<string, number>>((acc, alerta) => {
    acc[alerta.tipo_alerta] = (acc[alerta.tipo_alerta] ?? 0) + 1;
    return acc;
  }, {});

  const alertasFiltradas = alertas.filter((alerta) => {
    const coincideTipo = alerta.tipo_alerta
      .toLowerCase()
      .includes(filtroTipo.toLowerCase().trim());

    const coincideDistrito = (alerta.distrito ?? "")
      .toLowerCase()
      .includes(filtroDistrito.toLowerCase().trim());

    return coincideTipo && coincideDistrito;
  });

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando control CAD...</p>
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

            <h1 className="mt-4 text-3xl font-bold">Control CAD</h1>

            <p className="mt-3 text-slate-400">
              Alertas operativas de novedades, bitácora y apoyos CAD.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/cad"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a CAD
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

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {Object.entries(resumen).length === 0 ? (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5 md:col-span-4">
              <p className="text-sm text-emerald-300">
                No se detectaron alertas CAD.
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

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por tipo de alerta
            </label>
            <input
              value={filtroTipo}
              onChange={(event) => setFiltroTipo(event.target.value)}
              placeholder="Ej: NOVEDAD_ABIERTA, SIN_BITACORA"
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
            <h2 className="font-semibold text-cyan-300">Alertas detectadas</h2>
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
                    <th className="px-4 py-3">Novedad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Detalle</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {alertasFiltradas.map((alerta, index) => (
                    <tr
                      key={`${alerta.tipo_alerta}-${alerta.id}-${index}`}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium text-cyan-300">
                        {alerta.tipo_alerta}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {alerta.id_novedad ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {alerta.estado_novedad ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {alerta.distrito ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {alerta.id_puesto ?? "-"}
                      </td>

                      <td className="max-w-xl px-4 py-3 text-slate-300">
                        {alerta.detalle}
                      </td>

                      <td className="px-4 py-3">
                        {alerta.id ? (
                          <a
                            href={`/cad/novedad/${alerta.id}`}
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            Ver detalle
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
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