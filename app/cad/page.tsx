"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CadNovedad = {
  id: string;
  id_novedad: string | null;
  fecha: string;
  hora: string | null;
  tipo_novedad: string | null;
  prioridad: string | null;
  distrito: string | null;
  id_puesto: string | null;
  cedula_reporta: string | null;
  nombre_reporta: string | null;
  descripcion: string | null;
  estado_novedad: string | null;
  created_at: string;
};

export default function CadPage() {
  const [novedades, setNovedades] = useState<CadNovedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDistrito, setFiltroDistrito] = useState("");
  const [exportandoNovedades, setExportandoNovedades] = useState(false);
  const [exportandoCompleto, setExportandoCompleto] = useState(false);

  useEffect(() => {
    async function cargarNovedades() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todas: CadNovedad[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("cad_novedades")
          .select(
            "id, id_novedad, fecha, hora, tipo_novedad, prioridad, distrito, id_puesto, cedula_reporta, nombre_reporta, descripcion, estado_novedad, created_at"
          )
          .order("created_at", { ascending: false })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar novedades CAD: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todas = [...todas, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setNovedades(todas);
      setCargando(false);
    }

    cargarNovedades();
  }, []);

  async function exportarNovedades() {
    setExportandoNovedades(true);
    setMensaje("");

    try {
      const response = await fetch("/api/export/cad-novedades", {
        method: "POST",
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.ok) {
        setMensaje(
          `Error exportando novedades CAD: ${
            resultado.error ?? "Error desconocido"
          }`
        );
        return;
      }

      setMensaje(
        `Exportación completada. Novedades exportadas: ${resultado.total}.`
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `Error exportando novedades CAD: ${error.message}`
          : "Error exportando novedades CAD."
      );
    } finally {
      setExportandoNovedades(false);
    }
  }

  async function exportarCadCompleto() {
    setExportandoCompleto(true);
    setMensaje("");

    try {
      const response = await fetch("/api/export/cad-completo", {
        method: "POST",
      });

      const resultado = await response.json();

      if (!response.ok || !resultado.ok) {
        setMensaje(
          `Error exportando CAD completo: ${
            resultado.error ?? "Error desconocido"
          }`
        );
        return;
      }

      setMensaje(
        `Exportación completa CAD finalizada. Bitácora: ${resultado.bitacora}, apoyos: ${resultado.apoyos}, estado: ${resultado.estado}.`
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? `Error exportando CAD completo: ${error.message}`
          : "Error exportando CAD completo."
      );
    } finally {
      setExportandoCompleto(false);
    }
  }

  const novedadesFiltradas = novedades.filter((novedad) => {
    const coincideEstado = (novedad.estado_novedad ?? "")
      .toLowerCase()
      .includes(filtroEstado.toLowerCase().trim());

    const coincideDistrito = (novedad.distrito ?? "")
      .toLowerCase()
      .includes(filtroDistrito.toLowerCase().trim());

    return coincideEstado && coincideDistrito;
  });

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando novedades CAD...</p>
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

            <h1 className="mt-4 text-3xl font-bold">CAD Operativo</h1>

            <p className="mt-3 text-slate-400">
              Novedades operativas registradas en el módulo CAD.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportarNovedades}
              disabled={exportandoNovedades}
              className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportandoNovedades ? "Exportando..." : "Exportar novedades"}
            </button>

            <button
              type="button"
              onClick={exportarCadCompleto}
              disabled={exportandoCompleto}
              className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportandoCompleto ? "Exportando..." : "Exportar CAD completo"}
            </button>

            <a
              href="/cad/nueva"
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Nueva novedad
            </a>

            <a
              href="/cad/estado"
              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-300 hover:border-cyan-400 hover:text-cyan-200"
            >
              Estado tiempo real
            </a>

            <a
              href="/cad/apoyos"
              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-300 hover:border-cyan-400 hover:text-cyan-200"
            >
              Apoyos
            </a>

            <a
              href="/cad/bitacora"
              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-300 hover:border-cyan-400 hover:text-cyan-200"
            >
              Bitácora
            </a>

            <a
              href="/cad/control"
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
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
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
              placeholder="Ej: ABIERTA, CERRADA"
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
            <h2 className="font-semibold text-cyan-300">Novedades</h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {novedadesFiltradas.length} de {novedades.length}
            </p>
          </div>

          {novedadesFiltradas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay novedades CAD para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Prioridad</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Reporta</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {novedadesFiltradas.map((novedad) => (
                    <tr key={novedad.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-medium">
                        <a
                          href={`/cad/novedad/${novedad.id}`}
                          className="text-cyan-300 hover:text-cyan-200"
                        >
                          {novedad.id_novedad ?? "Ver detalle"}
                        </a>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {novedad.fecha}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {novedad.hora ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {novedad.tipo_novedad ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {novedad.prioridad ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {novedad.distrito ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {novedad.id_puesto ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {novedad.nombre_reporta ??
                          novedad.cedula_reporta ??
                          "-"}
                      </td>

                      <td className="max-w-xl px-4 py-3 text-slate-300">
                        {novedad.descripcion ?? "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {novedad.estado_novedad ?? "SIN ESTADO"}
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