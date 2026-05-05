"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type BitacoraCad = {
  id: string;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  comentario: string | null;
  created_at: string;
};

export default function CadBitacoraPage() {
  const [registros, setRegistros] = useState<BitacoraCad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");

  useEffect(() => {
    async function cargarBitacora() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todos: BitacoraCad[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("cad_bitacora_novedades")
          .select("id, accion, estado_anterior, estado_nuevo, comentario, created_at")
          .order("created_at", { ascending: false })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar bitácora CAD: ${error.message}`);
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

    cargarBitacora();
  }, []);

  const registrosFiltrados = registros.filter((registro) =>
    registro.accion.toLowerCase().includes(filtroAccion.toLowerCase().trim())
  );

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando bitácora CAD...</p>
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

            <h1 className="mt-4 text-3xl font-bold">Bitácora CAD</h1>

            <p className="mt-3 text-slate-400">
              Historial de acciones y cambios registrados sobre novedades CAD.
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

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="text-sm font-medium text-slate-300">
            Filtrar por acción
          </label>
          <input
            value={filtroAccion}
            onChange={(event) => setFiltroAccion(event.target.value)}
            placeholder="Ej: CREADA, CERRADA, ACTUALIZADA"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Registros de bitácora
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {registrosFiltrados.length} de {registros.length}
            </p>
          </div>

          {registrosFiltrados.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay registros de bitácora CAD para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Estado anterior</th>
                    <th className="px-4 py-3">Estado nuevo</th>
                    <th className="px-4 py-3">Comentario</th>
                  </tr>
                </thead>

                <tbody>
                  {registrosFiltrados.map((registro) => (
                    <tr key={registro.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(registro.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-cyan-300">
                        {registro.accion}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {registro.estado_anterior ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {registro.estado_nuevo ?? "-"}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-slate-300">
                        {registro.comentario ?? "-"}
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