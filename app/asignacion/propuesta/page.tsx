"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Disponible = {
  persona_id: string;
  cedula: string | null;
  nombres: string | null;
  grupo: string | null;
  area: string | null;
  estado_ciclo: string | null;
  disponible: boolean | null;
  motivo_no_disponible: string | null;
};

type PuestoDeficit = {
  id_puesto: string;
  distrito: string | null;
  acm_requeridos: number | null;
  acm_asignados: number | null;
  deficit: number | null;
};

type Propuesta = {
  cedula: string;
  nombres: string;
  grupo: string | null;
  area: string | null;
  id_puesto: string;
  distrito: string | null;
  fecha_inicio: string;
  estado_ciclo: string | null;
};

export default function PropuestaAsignacionPage() {
  const [fecha, setFecha] = useState("");
  const [disponibles, setDisponibles] = useState<Disponible[]>([]);
  const [puestosDeficit, setPuestosDeficit] = useState<PuestoDeficit[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [generando, setGenerando] = useState(false);

  async function generarPropuesta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fecha) {
      setMensaje("Selecciona una fecha para generar la propuesta.");
      return;
    }

    setGenerando(true);
    setMensaje("");
    setDisponibles([]);
    setPuestosDeficit([]);
    setPropuestas([]);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { data: disponiblesData, error: errorDisponibles } =
      await supabase.rpc("fn_personal_disponible_en_fecha", {
        p_fecha: fecha,
      });

    if (errorDisponibles) {
      setMensaje(
        `Error consultando personal disponible: ${errorDisponibles.message}`
      );
      setGenerando(false);
      return;
    }

    const { data: puestosData, error: errorPuestos } = await supabase.rpc(
      "fn_puestos_con_deficit"
    );

    if (errorPuestos) {
      setMensaje(`Error consultando puestos con déficit: ${errorPuestos.message}`);
      setGenerando(false);
      return;
    }

    const personalDisponible = ((disponiblesData ?? []) as Disponible[]).filter(
      (persona) => persona.disponible
    );

    const puestos = (puestosData ?? []) as PuestoDeficit[];

    const propuestaGenerada: Propuesta[] = [];
    let indicePersona = 0;

    for (const puesto of puestos) {
      const deficit = Number(puesto.deficit ?? 0);

      for (let i = 0; i < deficit; i++) {
        const persona = personalDisponible[indicePersona];

        if (!persona) break;

        propuestaGenerada.push({
          cedula: persona.cedula ?? "",
          nombres: persona.nombres ?? "",
          grupo: persona.grupo,
          area: persona.area,
          id_puesto: puesto.id_puesto,
          distrito: puesto.distrito,
          fecha_inicio: fecha,
          estado_ciclo: persona.estado_ciclo,
        });

        indicePersona++;
      }
    }

    setDisponibles(personalDisponible);
    setPuestosDeficit(puestos);
    setPropuestas(propuestaGenerada);

    setMensaje(
      `Propuesta generada. Disponibles: ${personalDisponible.length}. Puestos con déficit: ${puestos.length}. Asignaciones propuestas: ${propuestaGenerada.length}.`
    );

    setGenerando(false);
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
              Propuesta automática de asignación
            </h1>

            <p className="mt-3 text-slate-400">
              Genera una propuesta inicial con personal disponible y puestos con
              déficit. Esta pantalla todavía no guarda cambios.
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
              href="/asignacion/disponibles"
              className="rounded-xl border border-emerald-700 px-4 py-2 text-sm text-emerald-300 hover:border-emerald-400 hover:text-emerald-200"
            >
              Ver disponibles
            </a>
          </div>
        </div>

        <form
          onSubmit={generarPropuesta}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        >
          <label className="text-sm font-medium text-slate-300">
            Fecha de asignación
          </label>

          <input
            type="date"
            required
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className="mt-2 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />

          <button
            type="submit"
            disabled={generando}
            className="mt-5 block rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generando ? "Generando..." : "Generar propuesta"}
          </button>
        </form>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Personal disponible</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {disponibles.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Puestos con déficit</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">
              {puestosDeficit.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Propuestas</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {propuestas.length}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Asignaciones propuestas
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Revisa esta propuesta antes de aplicar cambios.
            </p>
          </div>

          {propuestas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay propuestas generadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Área</th>
                    <th className="px-4 py-3">Ciclo</th>
                    <th className="px-4 py-3">Puesto propuesto</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Fecha</th>
                  </tr>
                </thead>

                <tbody>
                  {propuestas.map((propuesta, index) => (
                    <tr
                      key={`${propuesta.cedula}-${propuesta.id_puesto}-${index}`}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.cedula}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.nombres}
                      </td>

                      <td className="px-4 py-3 font-medium text-cyan-300">
                        {propuesta.grupo ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.area ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.estado_ciclo ?? "-"}
                      </td>

                      <td className="px-4 py-3 font-medium text-amber-300">
                        {propuesta.id_puesto}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.distrito ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {propuesta.fecha_inicio}
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