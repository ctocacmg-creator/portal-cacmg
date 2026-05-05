"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Auditoria = {
  id: number;
  modulo: string;
  accion: string;
  cedula: string | null;
  detalle: Record<string, unknown> | null;
  created_at: string;
};

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<Auditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarAuditoria() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("auditoria")
        .select("id, modulo, accion, cedula, detalle, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setMensaje(`Error al cargar auditoría: ${error.message}`);
        setCargando(false);
        return;
      }

      setRegistros(data ?? []);
      setCargando(false);
    }

    cargarAuditoria();
  }, []);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando auditoría...</p>
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
            <h1 className="mt-4 text-3xl font-bold">Auditoría</h1>
            <p className="mt-3 text-slate-400">
              Registro de acciones relevantes ejecutadas en el sistema.
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
              Últimos registros
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total mostrado: {registros.length}
            </p>
          </div>

          {registros.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay registros de auditoría todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Módulo</th>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro) => (
                    <tr key={registro.id} className="border-t border-slate-800">
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(registro.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {registro.modulo}
                      </td>
                      <td className="px-4 py-3 text-cyan-300">
                        {registro.accion}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {registro.cedula ?? "-"}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-xs text-slate-400">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(registro.detalle ?? {}, null, 2)}
                        </pre>
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