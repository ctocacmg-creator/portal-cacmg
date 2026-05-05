"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Puesto = {
  id: string;
  id_puesto: string;
  distrito: string;
  circuito: string | null;
  subcircuito: string | null;
  sector: string | null;
  numero_acm: number | null;
  estado: string | null;
};

export default function PuestosPage() {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarPuestos() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todosLosPuestos: Puesto[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("puestos_operativos")
          .select(
            "id, id_puesto, distrito, circuito, subcircuito, sector, numero_acm, estado"
          )
          .order("distrito", { ascending: true })
          .order("id_puesto", { ascending: true })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar puestos: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todosLosPuestos = [...todosLosPuestos, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setPuestos(todosLosPuestos);
      setCargando(false);
    }

    cargarPuestos();
  }, []);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando puestos operativos...</p>
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
            <h1 className="mt-4 text-3xl font-bold">Puestos operativos</h1>
            <p className="mt-3 text-slate-400">
              Catálogo de puestos de servicio por distrito y servicios
              especiales.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
          >
            Volver al dashboard
          </a>
        </div>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Puestos registrados
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {puestos.length}
            </p>
          </div>

          {puestos.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay puestos registrados todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">ID Puesto</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Circuito</th>
                    <th className="px-4 py-3">Subcircuito</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">ACM</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {puestos.map((puesto) => (
                    <tr key={puesto.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium">
                        {puesto.id_puesto}
                      </td>
                      <td className="px-4 py-3">{puesto.distrito}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {puesto.circuito ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {puesto.subcircuito ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {puesto.sector ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {puesto.numero_acm ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {puesto.estado ?? "SIN ESTADO"}
                        </span>
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