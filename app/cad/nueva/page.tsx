"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function NuevaNovedadCadPage() {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [tipoNovedad, setTipoNovedad] = useState("");
  const [prioridad, setPrioridad] = useState("MEDIA");
  const [distrito, setDistrito] = useState("");
  const [circuito, setCircuito] = useState("");
  const [subcircuito, setSubcircuito] = useState("");
  const [idPuesto, setIdPuesto] = useState("");
  const [cedulaReporta, setCedulaReporta] = useState("");
  const [nombreReporta, setNombreReporta] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [accionTomada, setAccionTomada] = useState("");
  const [asignadoA, setAsignadoA] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crearNovedad(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const descripcionLimpia = descripcion.trim();

    if (!fecha || !descripcionLimpia) {
      setMensaje("La fecha y la descripción son obligatorias.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const ahora = new Date();
    const idNovedad = `CAD-${fecha}-${ahora.getTime()}`;

    const { data: novedadCreada, error } = await supabase
      .from("cad_novedades")
      .insert({
        id_novedad: idNovedad,
        fecha,
        hora: hora || null,
        tipo_novedad: tipoNovedad.trim().toUpperCase() || null,
        prioridad: prioridad.trim().toUpperCase() || "MEDIA",
        distrito: distrito.trim().toUpperCase() || null,
        circuito: circuito.trim().toUpperCase() || null,
        subcircuito: subcircuito.trim().toUpperCase() || null,
        id_puesto: idPuesto.trim().toUpperCase() || null,
        cedula_reporta: cedulaReporta.trim() || null,
        nombre_reporta: nombreReporta.trim().toUpperCase() || null,
        descripcion: descripcionLimpia,
        accion_tomada: accionTomada.trim() || null,
        estado_novedad: "ABIERTA",
        asignado_a: asignadoA.trim().toUpperCase() || null,
        registrado_por: sessionData.session.user.id,
      })
      .select("id, id_novedad")
      .single();

    if (error) {
      setMensaje(`Error al crear novedad: ${error.message}`);
      setGuardando(false);
      return;
    }

    await supabase.from("cad_bitacora_novedades").insert({
      novedad_id: novedadCreada.id,
      accion: "NOVEDAD_CREADA",
      estado_anterior: null,
      estado_nuevo: "ABIERTA",
      comentario: "Novedad creada desde el portal.",
      registrado_por: sessionData.session.user.id,
    });

    await supabase.from("auditoria").insert({
      modulo: "CAD",
      accion: "NOVEDAD_CREADA",
      usuario_id: sessionData.session.user.id,
      cedula: cedulaReporta.trim() || null,
      detalle: {
        id_novedad: novedadCreada.id_novedad,
        fecha,
        distrito: distrito.trim().toUpperCase() || null,
        id_puesto: idPuesto.trim().toUpperCase() || null,
      },
    });

    setMensaje("Novedad CAD creada correctamente.");
    setFecha("");
    setHora("");
    setTipoNovedad("");
    setPrioridad("MEDIA");
    setDistrito("");
    setCircuito("");
    setSubcircuito("");
    setIdPuesto("");
    setCedulaReporta("");
    setNombreReporta("");
    setDescripcion("");
    setAccionTomada("");
    setAsignadoA("");
    setGuardando(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              CACM-G
            </p>

            <h1 className="mt-4 text-3xl font-bold">Nueva novedad CAD</h1>

            <p className="mt-3 text-slate-400">
              Registra una novedad operativa directamente en el sistema.
            </p>
          </div>

          <a
            href="/cad"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
          >
            Volver a CAD
          </a>
        </div>

        <form
          onSubmit={crearNovedad}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Fecha
              </label>
              <input
                required
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">Hora</label>
              <input
                type="time"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Tipo de novedad
              </label>
              <input
                value={tipoNovedad}
                onChange={(event) => setTipoNovedad(event.target.value)}
                placeholder="Ej: OPERATIVA"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(event) => setPrioridad(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="BAJA">BAJA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="ALTA">ALTA</option>
                <option value="CRITICA">CRÍTICA</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Distrito
              </label>
              <input
                value={distrito}
                onChange={(event) => setDistrito(event.target.value)}
                placeholder="Ej: D1"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                ID puesto
              </label>
              <input
                value={idPuesto}
                onChange={(event) => setIdPuesto(event.target.value)}
                placeholder="Ej: D1-001"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Circuito
              </label>
              <input
                value={circuito}
                onChange={(event) => setCircuito(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Subcircuito
              </label>
              <input
                value={subcircuito}
                onChange={(event) => setSubcircuito(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Cédula reporta
              </label>
              <input
                value={cedulaReporta}
                onChange={(event) => setCedulaReporta(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Nombre reporta
              </label>
              <input
                value={nombreReporta}
                onChange={(event) => setNombreReporta(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Asignado a
              </label>
              <input
                value={asignadoA}
                onChange={(event) => setAsignadoA(event.target.value)}
                placeholder="Operador, unidad o responsable"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Descripción
              </label>
              <textarea
                required
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                placeholder="Describe la novedad..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Acción tomada
              </label>
              <textarea
                value={accionTomada}
                onChange={(event) => setAccionTomada(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                placeholder="Acción inicial o seguimiento..."
              />
            </div>
          </div>

          {mensaje ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              {mensaje}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={guardando}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Crear novedad CAD"}
          </button>
        </form>
      </section>
    </main>
  );
}