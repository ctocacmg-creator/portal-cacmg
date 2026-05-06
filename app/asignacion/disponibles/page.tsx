"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Disponible = {
  persona_id: string;
  cedula: string | null;
  nombres: string | null;
  grupo: string | null;
  area: string | null;
  tiene_asignacion_activa: boolean | null;
  asignacion_activa_puesto: string | null;
  tiene_ausentismo: boolean | null;
  tipo_ausentismo: string | null;
  tiene_condicion_especial: boolean | null;
  tipo_condicion: string | null;
  puede_operativo: string | null;
  restriccion_operativa: string | null;
  estado_ciclo: string | null;
  disponible: boolean | null;
  motivo_no_disponible: string | null;
};

function claseDisponibilidad(disponible: boolean | null) {
  if (disponible) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  return "bg-red-400/10 text-red-300";
}

function textoDisponibilidad(disponible: boolean | null) {
  return disponible ? "DISPONIBLE" : "NO DISPONIBLE";
}

export default function PersonalDisponiblePage() {
  const [fecha, setFecha] = useState("");
  const [registros, setRegistros] = useState<Disponible[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [filtro, setFiltro] = useState("");

  async function consultarDisponibilidad(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!fecha) {
      setMensaje("Selecciona una fecha para consultar disponibilidad.");
      return;
    }

    setConsultando(true);
    setMensaje("");
    setRegistros([]);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase.rpc(
      "fn_personal_disponible_en_fecha",
      {
        p_fecha: fecha,
      }
    );

    if (error) {
      setMensaje(`Error consultando disponibilidad: ${error.message}`);
      setConsultando(false);
      return;
    }

    setRegistros((data ?? []) as Disponible[]);
    setMensaje(`Consulta completada. Registros encontrados: ${data?.length ?? 0}.`);
    setConsultando(false);
  }

  const registrosFiltrados = registros.filter((registro) => {
    const texto = [
      registro.cedula,
      registro.nombres,
      registro.grupo,
      registro.area,
      registro.estado_ciclo,
      registro.motivo_no_disponible,
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(filtro.toLowerCase().trim());
  });

  const totalDisponibles = registros.filter((r) => r.disponible).length;
  const totalNoDisponibles = registros.length - totalDisponibles;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              CACM-G
            </p>

            <h1 className="mt-4 text-3xl font-bold">
              Personal disponible
            </h1>

            <p className="mt-3 text-slate-400">
              Consulta disponibilidad por fecha usando nómina, asignaciones,
              ausentismos, condiciones especiales y ciclos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/asignacion"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a asignación
            </a>

            <a
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Dashboard
            </a>
          </div>
        </div>

        <form
          onSubmit={consultarDisponibilidad}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Fecha de consulta
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Buscar
              </label>
              <input
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                placeholder="Buscar por cédula, nombre, grupo, área o motivo"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={consultando}
            className="mt-5 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {consultando ? "Consultando..." : "Consultar disponibilidad"}
          </button>
        </form>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total consultado</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {registros.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Disponibles</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {totalDisponibles}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">No disponibles</p>
            <p className="mt-2 text-3xl font-bold text-red-300">
              {totalNoDisponibles}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Resultado de disponibilidad
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Total: {registrosFiltrados.length} de {registros.length}
            </p>
          </div>

          {registrosFiltrados.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay resultados para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Área</th>
                    <th className="px-4 py-3">Ciclo</th>
                    <th className="px-4 py-3">Asignación</th>
                    <th className="px-4 py-3">Ausentismo</th>
                    <th className="px-4 py-3">Condición</th>
                    <th className="px-4 py-3">Motivo</th>
                  </tr>
                </thead>

                <tbody>
                  {registrosFiltrados.map((registro) => (
                    <tr
                      key={registro.persona_id}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${claseDisponibilidad(
                            registro.disponible
                          )}`}
                        >
                          {textoDisponibilidad(registro.disponible)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.cedula ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.nombres ?? "-"}
                      </td>

                      <td className="px-4 py-3 font-medium text-cyan-300">
                        {registro.grupo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.area ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.estado_ciclo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.asignacion_activa_puesto ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.tipo_ausentismo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.tipo_condicion ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {registro.motivo_no_disponible ?? "-"}
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