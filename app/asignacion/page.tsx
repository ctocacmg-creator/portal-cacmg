"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ResumenPuesto = {
  id_puesto: string;
  distrito: string;
  acm_requeridos: number;
  acm_asignados: number;
  deficit: number;
  sobrecupo: number;
};

export default function AsignacionPage() {
  const [resumen, setResumen] = useState<ResumenPuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarResumen() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todos: ResumenPuesto[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("resumen_puestos_asignacion")
          .select(
            "id_puesto, distrito, acm_requeridos, acm_asignados, deficit, sobrecupo"
          )
          .order("distrito", { ascending: true })
          .order("id_puesto", { ascending: true })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar asignación: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todos = [...todos, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setResumen(todos);
      setCargando(false);
    }

    cargarResumen();
  }, []);

  const totalRequeridos = resumen.reduce(
    (total, puesto) => total + Number(puesto.acm_requeridos ?? 0),
    0
  );

  const totalAsignados = resumen.reduce(
    (total, puesto) => total + Number(puesto.acm_asignados ?? 0),
    0
  );

  const totalDeficit = resumen.reduce(
    (total, puesto) => total + Number(puesto.deficit ?? 0),
    0
  );

  const totalSobrecupo = resumen.reduce(
    (total, puesto) => total + Number(puesto.sobrecupo ?? 0),
    0
  );

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando resumen de asignación...</p>
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
            <h1 className="mt-4 text-3xl font-bold">Asignación de servicio</h1>
            <p className="mt-3 text-slate-400">
              Resumen operativo por puesto: requeridos, asignados, déficit y
              sobrecupo.
            </p>
          </div>

<div className="flex gap-3">
  <a
    href="/asignacion/nueva"
    className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
  >
    Nueva asignación
  </a>

<a
  href="/asignacion/validar-ciclo"
  className="rounded-xl border border-amber-700 px-4 py-2 text-sm text-amber-300 hover:border-amber-400 hover:text-amber-200"
>
  Validar ciclo
</a>

<a
  href="/asignacion/activas"
  className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-300 hover:border-cyan-400 hover:text-cyan-200"
>
  Ver activas
</a>

<a
  href="/asignacion/control"
  className="rounded-xl border border-amber-700 px-4 py-2 text-sm text-amber-300 hover:border-amber-400 hover:text-amber-200"
>
  Control
</a>

  <a
    href="/dashboard"
    className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
  >
    Volver al dashboard
  </a>
</div>
        </div>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">ACM requeridos</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {totalRequeridos}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">ACM asignados</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {totalAsignados}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Déficit</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">
              {totalDeficit}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Sobrecupo</p>
            <p className="mt-2 text-3xl font-bold text-red-300">
              {totalSobrecupo}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Resumen por puesto
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total puestos: {resumen.length}
            </p>
          </div>

          {resumen.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay puestos disponibles para asignación.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">ID Puesto</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Requeridos</th>
                    <th className="px-4 py-3">Asignados</th>
                    <th className="px-4 py-3">Déficit</th>
                    <th className="px-4 py-3">Sobrecupo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((puesto) => (
                    <tr
                      key={puesto.id_puesto}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium">
                        {puesto.id_puesto}
                      </td>
                      <td className="px-4 py-3">{puesto.distrito}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {puesto.acm_requeridos}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {puesto.acm_asignados}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                          {puesto.deficit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300">
                          {puesto.sobrecupo}
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