"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CicloTrabajo = {
  id: string;
  nombre_ciclo: string;
  tipo_ciclo: string | null;
  mes: string | null;
  grupo: string | null;
  dias_trabajo: number | null;
  dias_descanso: number | null;
  dias_plan: Record<string, string> | null;
  descripcion: string | null;
  estado: string | null;
  created_at: string;
};

export default function CiclosPage() {
  const [ciclos, setCiclos] = useState<CicloTrabajo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");

  useEffect(() => {
    async function cargarCiclos() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("ciclos_trabajo")
        .select(
          "id, nombre_ciclo, tipo_ciclo, mes, grupo, dias_trabajo, dias_descanso, dias_plan, descripcion, estado, created_at"
        )
        .order("mes", { ascending: true })
        .order("grupo", { ascending: true })
        .order("nombre_ciclo", { ascending: true });

      if (error) {
        setMensaje(`Error al cargar ciclos: ${error.message}`);
        setCargando(false);
        return;
      }

      setCiclos(data ?? []);
      setCargando(false);
    }

    cargarCiclos();
  }, []);

  const ciclosFiltrados = ciclos.filter((ciclo) => {
    const coincideNombre = ciclo.nombre_ciclo
      .toLowerCase()
      .includes(filtroNombre.toLowerCase().trim());

    const coincideTipo = (ciclo.tipo_ciclo ?? "")
      .toLowerCase()
      .includes(filtroTipo.toLowerCase().trim());

    const coincideMes = (ciclo.mes ?? "")
      .toLowerCase()
      .includes(filtroMes.toLowerCase().trim());

    const coincideGrupo = (ciclo.grupo ?? "")
      .toLowerCase()
      .includes(filtroGrupo.toLowerCase().trim());

    return coincideNombre && coincideTipo && coincideMes && coincideGrupo;
  });

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando ciclos...</p>
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

            <h1 className="mt-4 text-3xl font-bold">Ciclos de trabajo</h1>

            <p className="mt-3 text-slate-400">
              Cronograma base y ciclos operativos importados desde Google
              Sheets.
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

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por ciclo
            </label>
            <input
              value={filtroNombre}
              onChange={(event) => setFiltroNombre(event.target.value)}
              placeholder="Ej: 12-2, 5-2..."
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por tipo
            </label>
            <input
              value={filtroTipo}
              onChange={(event) => setFiltroTipo(event.target.value)}
              placeholder="Ej: 12-2, 5-2"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por mes
            </label>
            <input
              value={filtroMes}
              onChange={(event) => setFiltroMes(event.target.value)}
              placeholder="Ej: MARZO, ABRIL"
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
              placeholder="Ej: G1, G2, G3"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">Registros de ciclos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {ciclosFiltrados.length} de {ciclos.length}
            </p>
          </div>

          {ciclosFiltrados.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay ciclos para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Ciclo</th>
                    <th className="px-4 py-3">Mes</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Días trabajo</th>
                    <th className="px-4 py-3">Días descanso</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Plan días</th>
                    <th className="px-4 py-3">Descripción</th>
                  </tr>
                </thead>

                <tbody>
                  {ciclosFiltrados.map((ciclo) => (
                    <tr key={ciclo.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium text-cyan-300">
                        {ciclo.nombre_ciclo}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {ciclo.mes ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {ciclo.grupo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {ciclo.tipo_ciclo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {ciclo.dias_trabajo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {ciclo.dias_descanso ?? "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {ciclo.estado ?? "SIN ESTADO"}
                        </span>
                      </td>

                      <td className="max-w-md px-4 py-3 text-xs text-slate-400">
                        {ciclo.dias_plan
                          ? Object.entries(ciclo.dias_plan)
                              .map(([dia, valor]) => `${dia}: ${valor}`)
                              .join(" | ")
                          : "-"}
                      </td>

                      <td className="max-w-xl px-4 py-3 text-slate-300">
                        {ciclo.descripcion ?? "-"}
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