"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Persona = {
  id: string;
  cedula: string;
  nombres: string;
  grupo: string | null;
  area: string | null;
};

type Puesto = {
  id: string;
  id_puesto: string;
  distrito: string;
};

export default function NuevaAsignacionPage() {
  const [cedula, setCedula] = useState("");
  const [idPuesto, setIdPuesto] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [funcion, setFuncion] = useState("");
  const [horario, setHorario] = useState("");
  const [observacion, setObservacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function crearAsignacion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const cedulaLimpia = cedula.trim();
    const idPuestoLimpio = idPuesto.trim().toUpperCase();

    const { data: persona, error: errorPersona } = await supabase
      .from("personas")
      .select("id, cedula, nombres, grupo, area")
      .eq("cedula", cedulaLimpia)
      .single<Persona>();

    if (errorPersona || !persona) {
      setMensaje("No se encontró una persona con esa cédula.");
      setCargando(false);
      return;
    }

    const { data: puesto, error: errorPuesto } = await supabase
      .from("puestos_operativos")
      .select("id, id_puesto, distrito")
      .eq("id_puesto", idPuestoLimpio)
      .single<Puesto>();

    if (errorPuesto || !puesto) {
      setMensaje("No se encontró un puesto con ese ID.");
      setCargando(false);
      return;
    }

const { data: ausentismoActivo, error: errorAusentismo } = await supabase
  .from("ausentismos")
  .select("id, tipo_ausentismo, fecha_inicio, fecha_fin")
  .eq("cedula", cedulaLimpia)
  .eq("estado", "ACTIVO")
  .lte("fecha_inicio", fechaInicio)
  .gte("fecha_fin", fechaInicio)
  .maybeSingle();

const { data: condicionEspecial, error: errorCondicion } = await supabase
  .from("condiciones_especiales")
  .select(
    "id, tipo_condicion, fecha_inicio, fecha_fin, puede_operativo, restriccion_operativa"
  )
  .eq("cedula", cedulaLimpia)
  .eq("estado", "ACTIVO")
  .lte("fecha_inicio", fechaInicio)
  .or(`fecha_fin.is.null,fecha_fin.gte.${fechaInicio}`)
  .maybeSingle();

if (errorCondicion) {
  setMensaje(`Error validando condiciones especiales: ${errorCondicion.message}`);
  setCargando(false);
  return;
}

if (condicionEspecial?.puede_operativo === "NO") {
  setMensaje(
    `No se puede asignar. El agente tiene condición especial bloqueante: ${condicionEspecial.tipo_condicion}.`
  );
  setCargando(false);
  return;
}

if (condicionEspecial?.puede_operativo === "RESTRINGIDO") {
  const confirmar = window.confirm(
    `El agente tiene condición especial RESTRINGIDA: ${condicionEspecial.tipo_condicion}. Restricción: ${condicionEspecial.restriccion_operativa ?? "Sin detalle"}. ¿Desea continuar con la asignación?`
  );

  if (!confirmar) {
    setMensaje("Asignación cancelada por condición especial restringida.");
    setCargando(false);
    return;
  }
}

if (errorAusentismo) {
  setMensaje(`Error validando ausentismos: ${errorAusentismo.message}`);
  setCargando(false);
  return;
}

if (ausentismoActivo) {
  setMensaje(
    `No se puede asignar. El agente tiene ausentismo activo: ${ausentismoActivo.tipo_ausentismo} del ${ausentismoActivo.fecha_inicio} al ${ausentismoActivo.fecha_fin}.`
  );
  setCargando(false);
  return;
}

    const { data: asignacionActiva } = await supabase
      .from("asignaciones")
      .select("id, id_puesto")
      .eq("cedula", cedulaLimpia)
      .eq("estado_asignacion", "ACTIVO")
      .maybeSingle();

    if (asignacionActiva) {
      setMensaje(
        `La persona ya tiene una asignación activa en ${asignacionActiva.id_puesto}.`
      );
      setCargando(false);
      return;
    }

    const { error: errorInsert } = await supabase.from("asignaciones").insert({
      persona_id: persona.id,
      puesto_id: puesto.id,
      cedula: persona.cedula,
      id_puesto: puesto.id_puesto,
      grupo: persona.grupo,
      area: persona.area,
      funcion: funcion.trim().toUpperCase() || null,
      horario: horario.trim().toUpperCase() || null,
      observacion: observacion.trim() || null,
      fecha_inicio: fechaInicio,
      estado_asignacion: "ACTIVO",
      creado_por: sessionData.session.user.id,
    });

    if (errorInsert) {
      setMensaje(`Error al crear asignación: ${errorInsert.message}`);
      setCargando(false);
      return;
    }

await supabase.from("auditoria").insert({
  modulo: "ASIGNACION",
  accion: "ASIGNACION_CREADA",
  usuario_id: sessionData.session.user.id,
  cedula: persona.cedula,
  detalle: {
    id_puesto: puesto.id_puesto,
    fecha_inicio: fechaInicio,
    funcion: funcion.trim().toUpperCase() || null,
    horario: horario.trim().toUpperCase() || null,
  },
});

    setMensaje("Asignación creada correctamente.");
    setCedula("");
    setIdPuesto("");
    setFuncion("");
    setHorario("");
    setObservacion("");
    setCargando(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <a
          href="/asignacion"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Volver a asignación
        </a>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            CACM-G
          </p>

          <h1 className="mt-4 text-3xl font-bold">Nueva asignación</h1>

          <p className="mt-3 text-sm text-slate-400">
            Registra una asignación activa de un agente a un puesto operativo.
          </p>

          <form onSubmit={crearAsignacion} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Cédula del agente
              </label>
              <input
                required
                value={cedula}
                onChange={(event) => setCedula(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                placeholder="Ej: 0102030405"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                ID del puesto
              </label>
              <input
                required
                value={idPuesto}
                onChange={(event) => setIdPuesto(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                placeholder="Ej: D1-001"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Fecha inicio
              </label>
              <input
                required
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Función
              </label>
              <input
                value={funcion}
                onChange={(event) => setFuncion(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                placeholder="Ej: SERVICIO OPERATIVO"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Horario
              </label>
              <input
                value={horario}
                onChange={(event) => setHorario(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                placeholder="Ej: 07H00-15H00"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            {mensaje ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                {mensaje}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? "Guardando..." : "Crear asignación"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}