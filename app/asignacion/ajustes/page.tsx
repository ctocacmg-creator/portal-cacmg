"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AsignacionActiva = {
  id: string;
  cedula: string;
  id_puesto: string;
  grupo: string | null;
  area: string | null;
  funcion: string | null;
  horario: string | null;
  observacion: string | null;
  fecha_inicio: string;
  estado_asignacion: string;
  personas: {
    nombres: string | null;
  } | null;
};

type Puesto = {
  id: string;
  id_puesto: string;
  distrito: string | null;
};

export default function AjustesAsignacionPage() {
  const [asignaciones, setAsignaciones] = useState<AsignacionActiva[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const { data: asignacionesData, error: errorAsignaciones } =
        await supabase
          .from("asignaciones")
          .select(
            "id, cedula, id_puesto, grupo, area, funcion, horario, observacion, fecha_inicio, estado_asignacion, personas(nombres)"
          )
          .eq("estado_asignacion", "ACTIVO")
          .order("id_puesto", { ascending: true });

      if (errorAsignaciones) {
        setMensaje(
          `Error al cargar asignaciones: ${errorAsignaciones.message}`
        );
        setCargando(false);
        return;
      }

      const { data: puestosData, error: errorPuestos } = await supabase
        .from("puestos_operativos")
        .select("id, id_puesto, distrito")
        .order("id_puesto", { ascending: true });

      if (errorPuestos) {
        setMensaje(`Error al cargar puestos: ${errorPuestos.message}`);
        setCargando(false);
        return;
      }

      setAsignaciones((asignacionesData ?? []) as AsignacionActiva[]);
      setPuestos((puestosData ?? []) as Puesto[]);
      setCargando(false);
    }

    cargarDatos();
  }, []);

  function actualizarCampo(
    id: string,
    campo: keyof Pick<
      AsignacionActiva,
      "id_puesto" | "funcion" | "horario" | "observacion"
    >,
    valor: string
  ) {
    setAsignaciones((actual) =>
      actual.map((asignacion) =>
        asignacion.id === id
          ? {
              ...asignacion,
              [campo]: valor,
            }
          : asignacion
      )
    );
  }

  async function guardarAjuste(asignacion: AsignacionActiva) {
    setGuardandoId(asignacion.id);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const idPuestoLimpio = asignacion.id_puesto.trim().toUpperCase();

    const puestoSeleccionado = puestos.find(
      (puesto) => puesto.id_puesto === idPuestoLimpio
    );

    if (!puestoSeleccionado) {
      setMensaje("El puesto seleccionado no existe en el catálogo.");
      setGuardandoId("");
      return;
    }

    const { error } = await supabase
      .from("asignaciones")
      .update({
        puesto_id: puestoSeleccionado.id,
        id_puesto: puestoSeleccionado.id_puesto,
        funcion: asignacion.funcion?.trim().toUpperCase() || null,
        horario: asignacion.horario?.trim().toUpperCase() || null,
        observacion: asignacion.observacion?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", asignacion.id);

    if (error) {
      setMensaje(`Error al guardar ajuste: ${error.message}`);
      setGuardandoId("");
      return;
    }

    await supabase.from("auditoria").insert({
      modulo: "ASIGNACION",
      accion: "ASIGNACION_AJUSTADA",
      usuario_id: sessionData.session.user.id,
      cedula: asignacion.cedula,
      detalle: {
        asignacion_id: asignacion.id,
        id_puesto: puestoSeleccionado.id_puesto,
        funcion: asignacion.funcion?.trim().toUpperCase() || null,
        horario: asignacion.horario?.trim().toUpperCase() || null,
        observacion: asignacion.observacion?.trim() || null,
      },
    });

    setMensaje("Ajuste guardado correctamente.");
    setGuardandoId("");
  }

  const asignacionesFiltradas = asignaciones.filter((asignacion) => {
    const texto = [
      asignacion.cedula,
      asignacion.personas?.nombres,
      asignacion.id_puesto,
      asignacion.grupo,
      asignacion.funcion,
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(filtro.toLowerCase().trim());
  });

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando ajustes de asignación...</p>
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
              Ajuste manual de distribución
            </h1>

            <p className="mt-3 text-slate-400">
              Modifica puesto, función, horario u observación de asignaciones
              activas sin tocar Google Sheets.
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

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="text-sm font-medium text-slate-300">
            Buscar asignación
          </label>
          <input
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Buscar por cédula, nombre, puesto, grupo o función"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Asignaciones activas
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Total: {asignacionesFiltradas.length} de {asignaciones.length}
            </p>
          </div>

          {asignacionesFiltradas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay asignaciones activas para ajustar.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {asignacionesFiltradas.map((asignacion) => (
                <div key={asignacion.id} className="p-5">
                  <div className="grid gap-4 lg:grid-cols-6">
                    <div>
                      <p className="text-xs text-slate-500">Cédula</p>
                      <p className="mt-1 font-semibold text-slate-300">
                        {asignacion.cedula}
                      </p>
                    </div>

                    <div className="lg:col-span-2">
                      <p className="text-xs text-slate-500">Nombre</p>
                      <p className="mt-1 font-semibold text-slate-300">
                        {asignacion.personas?.nombres ?? "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Grupo</p>
                      <p className="mt-1 font-semibold text-cyan-300">
                        {asignacion.grupo ?? "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Fecha inicio</p>
                      <p className="mt-1 font-semibold text-slate-300">
                        {asignacion.fecha_inicio}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Estado</p>
                      <p className="mt-1 font-semibold text-emerald-300">
                        {asignacion.estado_asignacion}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Puesto
                      </label>
                      <select
                        value={asignacion.id_puesto}
                        onChange={(event) =>
                          actualizarCampo(
                            asignacion.id,
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
                        value={asignacion.funcion ?? ""}
                        onChange={(event) =>
                          actualizarCampo(
                            asignacion.id,
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
                        value={asignacion.horario ?? ""}
                        onChange={(event) =>
                          actualizarCampo(
                            asignacion.id,
                            "horario",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Observación
                      </label>
                      <input
                        value={asignacion.observacion ?? ""}
                        onChange={(event) =>
                          actualizarCampo(
                            asignacion.id,
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
                      onClick={() => guardarAjuste(asignacion)}
                      disabled={guardandoId === asignacion.id}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {guardandoId === asignacion.id
                        ? "Guardando..."
                        : "Guardar ajuste"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}