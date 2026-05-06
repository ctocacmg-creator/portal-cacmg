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

type Puesto = {
  id: string;
  id_puesto: string;
  distrito: string | null;
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
  funcion: string;
  horario: string;
  observacion: string;
};

export default function PropuestaAsignacionPage() {
  const [fecha, setFecha] = useState("");
  const [disponibles, setDisponibles] = useState<Disponible[]>([]);
  const [puestosDeficit, setPuestosDeficit] = useState<PuestoDeficit[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [generando, setGenerando] = useState(false);
  const [filtro, setFiltro] = useState("");

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
    setPuestos([]);
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

    const { data: puestosDeficitData, error: errorPuestosDeficit } =
      await supabase.rpc("fn_puestos_con_deficit");

    if (errorPuestosDeficit) {
      setMensaje(
        `Error consultando puestos con déficit: ${errorPuestosDeficit.message}`
      );
      setGenerando(false);
      return;
    }

    const { data: puestosData, error: errorCatalogoPuestos } = await supabase
      .from("puestos_operativos")
      .select("id, id_puesto, distrito")
      .order("distrito", { ascending: true })
      .order("id_puesto", { ascending: true });

    if (errorCatalogoPuestos) {
      setMensaje(
        `Error cargando catálogo de puestos: ${errorCatalogoPuestos.message}`
      );
      setGenerando(false);
      return;
    }

    const personalDisponible = ((disponiblesData ?? []) as Disponible[]).filter(
      (persona) => persona.disponible
    );

    const puestosConDeficit = (puestosDeficitData ?? []) as PuestoDeficit[];

    const propuestaGenerada: Propuesta[] = [];
    let indicePersona = 0;

    for (const puesto of puestosConDeficit) {
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
          funcion: "SERVICIO OPERATIVO",
          horario: "",
          observacion: "Propuesta automática pendiente de revisión.",
        });

        indicePersona++;
      }
    }

    setDisponibles(personalDisponible);
    setPuestosDeficit(puestosConDeficit);
    setPuestos((puestosData ?? []) as Puesto[]);
    setPropuestas(propuestaGenerada);

    setMensaje(
      `Propuesta generada. Disponibles: ${personalDisponible.length}. Puestos con déficit: ${puestosConDeficit.length}. Asignaciones propuestas: ${propuestaGenerada.length}.`
    );

    setGenerando(false);
  }

  function actualizarPropuesta(
    index: number,
    campo: keyof Pick<
      Propuesta,
      "id_puesto" | "funcion" | "horario" | "observacion"
    >,
    valor: string
  ) {
    setPropuestas((actual) =>
      actual.map((propuesta, i) => {
        if (i !== index) return propuesta;

        if (campo === "id_puesto") {
          const puestoSeleccionado = puestos.find(
            (puesto) => puesto.id_puesto === valor
          );

          return {
            ...propuesta,
            id_puesto: valor,
            distrito: puestoSeleccionado?.distrito ?? propuesta.distrito,
          };
        }

        return {
          ...propuesta,
          [campo]: valor,
        };
      })
    );
  }

  function quitarPropuesta(index: number) {
    const confirmar = window.confirm(
      "¿Deseas quitar esta persona de la propuesta?"
    );

    if (!confirmar) return;

    setPropuestas((actual) => actual.filter((_, i) => i !== index));
  }

  const propuestasFiltradas = propuestas.filter((propuesta) => {
    const texto = [
      propuesta.cedula,
      propuesta.nombres,
      propuesta.grupo,
      propuesta.area,
      propuesta.id_puesto,
      propuesta.distrito,
      propuesta.funcion,
      propuesta.horario,
      propuesta.observacion,
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(filtro.toLowerCase().trim());
  });

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
              Genera una propuesta inicial y permite afinar manualmente la
              distribución antes de aplicar cambios.
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
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Fecha de asignación
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
                Buscar en propuesta
              </label>

              <input
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                placeholder="Buscar por cédula, nombre, grupo, puesto, función u observación"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>
          </div>

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

        <div className="mt-8 grid gap-4 md:grid-cols-4">
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Mostradas</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {propuestasFiltradas.length}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Afinación manual de propuesta
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Cambia el puesto, función, horario u observación. Estos cambios
              todavía no se guardan en la base de datos.
            </p>
          </div>

          {propuestasFiltradas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay propuestas generadas.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {propuestasFiltradas.map((propuesta) => {
                const indexReal = propuestas.findIndex(
                  (item) =>
                    item.cedula === propuesta.cedula &&
                    item.id_puesto === propuesta.id_puesto &&
                    item.fecha_inicio === propuesta.fecha_inicio
                );

                return (
                  <div
                    key={`${propuesta.cedula}-${propuesta.id_puesto}-${indexReal}`}
                    className="p-5"
                  >
                    <div className="grid gap-4 lg:grid-cols-6">
                      <div>
                        <p className="text-xs text-slate-500">Cédula</p>
                        <p className="mt-1 font-semibold text-slate-300">
                          {propuesta.cedula}
                        </p>
                      </div>

                      <div className="lg:col-span-2">
                        <p className="text-xs text-slate-500">Nombre</p>
                        <p className="mt-1 font-semibold text-slate-300">
                          {propuesta.nombres}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Grupo</p>
                        <p className="mt-1 font-semibold text-cyan-300">
                          {propuesta.grupo ?? "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Área</p>
                        <p className="mt-1 font-semibold text-slate-300">
                          {propuesta.area ?? "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Ciclo</p>
                        <p className="mt-1 font-semibold text-emerald-300">
                          {propuesta.estado_ciclo ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          Puesto propuesto
                        </label>

                        <select
                          value={propuesta.id_puesto}
                          onChange={(event) =>
                            actualizarPropuesta(
                              indexReal,
                              "id_puesto",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                        >
                          {puestos.map((puesto) => (
                            <option key={puesto.id} value={puesto.id_puesto}>
                              {puesto.id_puesto}{" "}
                              {puesto.distrito ? `- ${puesto.distrito}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          Función
                        </label>

                        <input
                          value={propuesta.funcion}
                          onChange={(event) =>
                            actualizarPropuesta(
                              indexReal,
                              "funcion",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          Horario
                        </label>

                        <input
                          value={propuesta.horario}
                          onChange={(event) =>
                            actualizarPropuesta(
                              indexReal,
                              "horario",
                              event.target.value
                            )
                          }
                          placeholder="Ej: 07H00-15H00"
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          Observación
                        </label>

                        <input
                          value={propuesta.observacion}
                          onChange={(event) =>
                            actualizarPropuesta(
                              indexReal,
                              "observacion",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => quitarPropuesta(indexReal)}
                        className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:text-red-200"
                      >
                        Quitar de propuesta
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}