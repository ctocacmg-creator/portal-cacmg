"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EstadoCad = {
  id: string;
  id_puesto: string | null;
  distrito: string | null;
  circuito: string | null;
  subcircuito: string | null;
  cedula: string | null;
  nombre: string | null;
  estado_operativo: string | null;
  ubicacion_referencial: string | null;
  ultima_actualizacion: string | null;
  observacion: string | null;
};

export default function CadEstadoPage() {
  const [estados, setEstados] = useState<EstadoCad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroDistrito, setFiltroDistrito] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    async function cargarEstados() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todos: EstadoCad[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("cad_estado_tiempo_real")
          .select(
            "id, id_puesto, distrito, circuito, subcircuito, cedula, nombre, estado_operativo, ubicacion_referencial, ultima_actualizacion, observacion"
          )
          .order("distrito", { ascending: true })
          .order("id_puesto", { ascending: true })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar estado CAD: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todos = [...todos, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setEstados(todos);
      setCargando(false);
    }

    cargarEstados();
  }, []);

  const estadosFiltrados = estados.filter((estado) => {
    const coincideDistrito = (estado.distrito ?? "")
      .toLowerCase()
      .includes(filtroDistrito.toLowerCase().trim());

    const coincideEstado = (estado.estado_operativo ?? "")
      .toLowerCase()
      .includes(filtroEstado.toLowerCase().trim());

    return coincideDistrito && coincideEstado;
  });

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando estado CAD...</p>
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
              Estado CAD en tiempo real
            </h1>

            <p className="mt-3 text-slate-400">
              Estado operativo de puestos, agentes y ubicación referencial.
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

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
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

          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por estado
            </label>
            <input
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              placeholder="Ej: DISPONIBLE, OCUPADO"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">Estado operativo</h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {estadosFiltrados.length} de {estados.length}
            </p>
          </div>

          {estadosFiltrados.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay registros de estado CAD para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Circuito</th>
                    <th className="px-4 py-3">Subcircuito</th>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3">Actualización</th>
                    <th className="px-4 py-3">Observación</th>
                  </tr>
                </thead>

                <tbody>
                  {estadosFiltrados.map((estado) => (
                    <tr key={estado.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium">
                        {estado.id_puesto ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {estado.distrito ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {estado.circuito ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {estado.subcircuito ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {estado.cedula ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {estado.nombre ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {estado.estado_operativo ?? "SIN ESTADO"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {estado.ubicacion_referencial ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {estado.ultima_actualizacion
                          ? new Date(
                              estado.ultima_actualizacion
                            ).toLocaleString()
                          : "-"}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-slate-300">
                        {estado.observacion ?? "-"}
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