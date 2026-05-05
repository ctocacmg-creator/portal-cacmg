"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AsignacionActiva = {
  id: string;
  cedula: string;
  nombres: string | null;
  grado: string | null;
  id_puesto: string;
  distrito: string | null;
  circuito: string | null;
  subcircuito: string | null;
  grupo: string | null;
  area: string | null;
  funcion: string | null;
  horario: string | null;
  fecha_inicio: string;
  estado_asignacion: string;
  created_at: string;
};

export default function AsignacionesActivasPage() {
  const [asignaciones, setAsignaciones] = useState<AsignacionActiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  async function cerrarAsignacion(id: string) {
    const confirmar = window.confirm(
      "¿Seguro que deseas cerrar esta asignación activa?"
    );

    if (!confirmar) return;

    setMensaje("");

    const hoy = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("asignaciones")
      .update({
        estado_asignacion: "FINALIZADO",
        fecha_fin: hoy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMensaje(`Error al cerrar asignación: ${error.message}`);
      return;
    }

    setAsignaciones((actuales) =>
      actuales.filter((asignacion) => asignacion.id !== id)
    );

    setMensaje("Asignación cerrada correctamente.");
  }

  useEffect(() => {
    async function cargarAsignaciones() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const pageSize = 1000;
      let desde = 0;
      let todas: AsignacionActiva[] = [];

      while (true) {
        const hasta = desde + pageSize - 1;

        const { data, error } = await supabase
          .from("v_asignaciones_activas")
          .select(
            "id, cedula, nombres, grado, id_puesto, distrito, circuito, subcircuito, grupo, area, funcion, horario, fecha_inicio, estado_asignacion, created_at"
          )
          .order("created_at", { ascending: false })
          .range(desde, hasta);

        if (error) {
          setMensaje(`Error al cargar asignaciones: ${error.message}`);
          setCargando(false);
          return;
        }

        const lote = data ?? [];
        todas = [...todas, ...lote];

        if (lote.length < pageSize) break;

        desde += pageSize;
      }

      setAsignaciones(todas);
      setCargando(false);
    }

    cargarAsignaciones();
  }, []);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando asignaciones activas...</p>
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

            <h1 className="mt-4 text-3xl font-bold">Asignaciones activas</h1>

            <p className="mt-3 text-slate-400">
              Personal actualmente asignado a puestos operativos.
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
              href="/asignacion"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver
            </a>
          </div>
        </div>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">Registros activos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {asignaciones.length}
            </p>
          </div>

          {asignaciones.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay asignaciones activas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Nombres</th>
                    <th className="px-4 py-3">Grado</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Área</th>
                    <th className="px-4 py-3">Función</th>
                    <th className="px-4 py-3">Horario</th>
                    <th className="px-4 py-3">Fecha inicio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {asignaciones.map((asignacion) => (
                    <tr
                      key={asignacion.id}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium">
                        {asignacion.cedula}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.nombres ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.grado ?? "-"}
                      </td>

                      <td className="px-4 py-3">{asignacion.id_puesto}</td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.distrito ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.grupo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.area ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.funcion ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.horario ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {asignacion.fecha_inicio}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {asignacion.estado_asignacion}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => cerrarAsignacion(asignacion.id)}
                          className="rounded-xl border border-red-800 px-3 py-1 text-xs font-semibold text-red-300 hover:border-red-500 hover:text-red-200"
                        >
                          Cerrar
                        </button>
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