"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ApoyoCad = {
  id: string;
  cedula: string | null;
  nombre: string | null;
  distrito: string | null;
  id_puesto_origen: string | null;
  id_puesto_destino: string | null;
  tipo_apoyo: string | null;
  estado_apoyo: string | null;
  observacion: string | null;
  fecha_cierre: string | null;
  hora_cierre: string | null;
  created_at: string;
};

export default function CadApoyosPage() {
  const [apoyos, setApoyos] = useState<ApoyoCad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDistrito, setFiltroDistrito] = useState("");

  useEffect(() => {
    async function cargarApoyos() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todos: ApoyoCad[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("cad_apoyos_novedades")
          .select(
            "id, cedula, nombre, distrito, id_puesto_origen, id_puesto_destino, tipo_apoyo, estado_apoyo, observacion, fecha_cierre, hora_cierre, created_at"
          )
          .order("created_at", { ascending: false })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar apoyos CAD: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todos = [...todos, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setApoyos(todos);
      setCargando(false);
    }

    cargarApoyos();
  }, []);

  const apoyosFiltrados = apoyos.filter((apoyo) => {
    const coincideEstado = (apoyo.estado_apoyo ?? "")
      .toLowerCase()
      .includes(filtroEstado.toLowerCase().trim());

    const coincideDistrito = (apoyo.distrito ?? "")
      .toLowerCase()
      .includes(filtroDistrito.toLowerCase().trim());

    return coincideEstado && coincideDistrito;
  });

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando apoyos CAD...</p>
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

            <h1 className="mt-4 text-3xl font-bold">Apoyos CAD</h1>

            <p className="mt-3 text-slate-400">
              Apoyos asignados a novedades operativas.
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
              Filtrar por estado
            </label>
            <input
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              placeholder="Ej: ACTIVO, CERRADO"
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
            <h2 className="font-semibold text-cyan-300">Apoyos registrados</h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {apoyosFiltrados.length} de {apoyos.length}
            </p>
          </div>

          {apoyosFiltrados.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay apoyos CAD para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Cierre</th>
                    <th className="px-4 py-3">Observación</th>
                  </tr>
                </thead>

                <tbody>
                  {apoyosFiltrados.map((apoyo) => (
                    <tr key={apoyo.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium">
                        {apoyo.cedula ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {apoyo.nombre ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {apoyo.distrito ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {apoyo.id_puesto_origen ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {apoyo.id_puesto_destino ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {apoyo.tipo_apoyo ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {apoyo.estado_apoyo ?? "SIN ESTADO"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {apoyo.fecha_cierre ?? "-"} {apoyo.hora_cierre ?? ""}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-slate-300">
                        {apoyo.observacion ?? "-"}
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