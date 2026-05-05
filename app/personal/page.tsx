"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Persona = {
  id: string;
  cedula: string;
  nombres: string;
  grado: string | null;
  grupo: string | null;
  area: string | null;
  distrito: string | null;
  estado: string | null;
};

export default function PersonalPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarPersonas() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

const pageSize = 1000;
let desde = 0;
let todasLasPersonas: Persona[] = [];

while (true) {
  const hasta = desde + pageSize - 1;

  const { data, error } = await supabase
    .from("personas")
    .select("id, cedula, nombres, grado, grupo, area, distrito, estado")
    .order("nombres", { ascending: true })
    .range(desde, hasta);

  if (error) {
    setMensaje(`Error al cargar personal: ${error.message}`);
    setCargando(false);
    return;
  }

  const lote = data ?? [];
  todasLasPersonas = [...todasLasPersonas, ...lote];

  if (lote.length < pageSize) {
    break;
  }

  desde += pageSize;
}

setPersonas(todasLasPersonas);
setCargando(false);
    }

    cargarPersonas();
  }, []);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando personal...</p>
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
            <h1 className="mt-4 text-3xl font-bold">Gestión de personal</h1>
            <p className="mt-3 text-slate-400">
              Nómina operativa, estado del agente, distrito, grupo y área.
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
              Personal registrado
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {personas.length}
            </p>
          </div>

          {personas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay personal registrado todavía. El siguiente paso será
              importar NOMINA desde Sheets o CSV.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Nombres</th>
                    <th className="px-4 py-3">Grado</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Área</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {personas.map((persona) => (
                    <tr key={persona.id} className="border-t border-slate-800">
                      <td className="px-4 py-3">{persona.cedula}</td>
                      <td className="px-4 py-3 font-medium">
                        {persona.nombres}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {persona.grado ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {persona.grupo ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {persona.area ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {persona.distrito ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {persona.estado ?? "SIN ESTADO"}
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