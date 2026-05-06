"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Novedad = {
  id: string;
  id_novedad: string | null;
  fecha: string;
  hora: string | null;
  tipo_novedad: string | null;
  prioridad: string | null;
  distrito: string | null;
  circuito: string | null;
  subcircuito: string | null;
  id_puesto: string | null;
  cedula_reporta: string | null;
  nombre_reporta: string | null;
  descripcion: string | null;
  accion_tomada: string | null;
  estado_novedad: string | null;
  asignado_a: string | null;
  fecha_cierre: string | null;
  hora_cierre: string | null;
  evidencia_url: string | null;
  created_at: string;
};

type Bitacora = {
  id: string;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  comentario: string | null;
  created_at: string;
};

type Apoyo = {
  id: string;
  cedula: string | null;
  nombre: string | null;
  distrito: string | null;
  id_puesto_origen: string | null;
  id_puesto_destino: string | null;
  tipo_apoyo: string | null;
  estado_apoyo: string | null;
  observacion: string | null;
  created_at: string;
};

export default function DetalleNovedadCadPage() {
  const params = useParams<{ id: string }>();

  const [novedad, setNovedad] = useState<Novedad | null>(null);
  const [bitacora, setBitacora] = useState<Bitacora[]>([]);
  const [apoyos, setApoyos] = useState<Apoyo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [comentario, setComentario] = useState("");
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  async function cerrarNovedad() {
    if (!novedad) return;

    const confirmar = window.confirm(
      "¿Seguro que deseas cerrar esta novedad CAD?"
    );

    if (!confirmar) return;

    setCerrando(true);
    setMensaje("");

    const ahora = new Date();
    const fechaCierre = ahora.toISOString().slice(0, 10);
    const horaCierre = ahora.toTimeString().slice(0, 8);

    const { data: sessionData } = await supabase.auth.getSession();

    const { error: errorUpdate } = await supabase
      .from("cad_novedades")
      .update({
        estado_novedad: "CERRADA",
        fecha_cierre: fechaCierre,
        hora_cierre: horaCierre,
        updated_at: ahora.toISOString(),
      })
      .eq("id", novedad.id);

    if (errorUpdate) {
      setMensaje(`Error al cerrar novedad: ${errorUpdate.message}`);
      setCerrando(false);
      return;
    }

    const { error: errorBitacora } = await supabase
      .from("cad_bitacora_novedades")
      .insert({
        novedad_id: novedad.id,
        accion: "NOVEDAD_CERRADA",
        estado_anterior: novedad.estado_novedad,
        estado_nuevo: "CERRADA",
        comentario: "Novedad cerrada desde el portal.",
        registrado_por: sessionData.session?.user.id ?? null,
      });

    if (errorBitacora) {
      setMensaje(
        `La novedad se cerró, pero falló el registro de bitácora: ${errorBitacora.message}`
      );
      setCerrando(false);
      return;
    }

    const { error: errorAuditoria } = await supabase.from("auditoria").insert({
      modulo: "CAD",
      accion: "NOVEDAD_CERRADA",
      usuario_id: sessionData.session?.user.id ?? null,
      cedula: novedad.cedula_reporta,
      detalle: {
        id_novedad: novedad.id_novedad,
        fecha_cierre: fechaCierre,
        hora_cierre: horaCierre,
      },
    });

    if (errorAuditoria) {
      setMensaje(
        `La novedad se cerró, pero falló el registro de auditoría: ${errorAuditoria.message}`
      );
      setCerrando(false);
      return;
    }

    setNovedad({
      ...novedad,
      estado_novedad: "CERRADA",
      fecha_cierre: fechaCierre,
      hora_cierre: horaCierre,
    });

    setBitacora((actual) => [
      {
        id: crypto.randomUUID(),
        accion: "NOVEDAD_CERRADA",
        estado_anterior: novedad.estado_novedad,
        estado_nuevo: "CERRADA",
        comentario: "Novedad cerrada desde el portal.",
        created_at: ahora.toISOString(),
      },
      ...actual,
    ]);

    setMensaje("Novedad cerrada correctamente.");
    setCerrando(false);
  }

  async function agregarComentario() {
    if (!novedad) return;

    const comentarioLimpio = comentario.trim();

    if (!comentarioLimpio) {
      setMensaje("Escribe un comentario antes de guardar.");
      return;
    }

    setGuardandoComentario(true);
    setMensaje("");

    const ahora = new Date();
    const { data: sessionData } = await supabase.auth.getSession();

    const { error: errorBitacora } = await supabase
      .from("cad_bitacora_novedades")
      .insert({
        novedad_id: novedad.id,
        accion: "COMENTARIO_AGREGADO",
        estado_anterior: novedad.estado_novedad,
        estado_nuevo: novedad.estado_novedad,
        comentario: comentarioLimpio,
        registrado_por: sessionData.session?.user.id ?? null,
      });

    if (errorBitacora) {
      setMensaje(`Error al guardar comentario: ${errorBitacora.message}`);
      setGuardandoComentario(false);
      return;
    }

    const { error: errorUpdate } = await supabase
      .from("cad_novedades")
      .update({
        accion_tomada: comentarioLimpio,
        updated_at: ahora.toISOString(),
      })
      .eq("id", novedad.id);

    if (errorUpdate) {
      setMensaje(
        `El comentario se guardó en bitácora, pero no se pudo actualizar la acción tomada: ${errorUpdate.message}`
      );
      setGuardandoComentario(false);
      return;
    }

    const { error: errorAuditoria } = await supabase.from("auditoria").insert({
      modulo: "CAD",
      accion: "COMENTARIO_NOVEDAD",
      usuario_id: sessionData.session?.user.id ?? null,
      cedula: novedad.cedula_reporta,
      detalle: {
        id_novedad: novedad.id_novedad,
        comentario: comentarioLimpio,
      },
    });

    if (errorAuditoria) {
      setMensaje(
        `El comentario se guardó, pero falló el registro de auditoría: ${errorAuditoria.message}`
      );
      setGuardandoComentario(false);
      return;
    }

    setNovedad({
      ...novedad,
      accion_tomada: comentarioLimpio,
    });

    setBitacora((actual) => [
      {
        id: crypto.randomUUID(),
        accion: "COMENTARIO_AGREGADO",
        estado_anterior: novedad.estado_novedad,
        estado_nuevo: novedad.estado_novedad,
        comentario: comentarioLimpio,
        created_at: ahora.toISOString(),
      },
      ...actual,
    ]);

    setComentario("");
    setMensaje("Comentario agregado correctamente.");
    setGuardandoComentario(false);
  }

  useEffect(() => {
    async function cargarDetalle() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const id = params.id;

      const { data: novedadData, error: errorNovedad } = await supabase
        .from("cad_novedades")
        .select(
          "id, id_novedad, fecha, hora, tipo_novedad, prioridad, distrito, circuito, subcircuito, id_puesto, cedula_reporta, nombre_reporta, descripcion, accion_tomada, estado_novedad, asignado_a, fecha_cierre, hora_cierre, evidencia_url, created_at"
        )
        .eq("id", id)
        .single<Novedad>();

      if (errorNovedad) {
        setMensaje(`Error al cargar novedad: ${errorNovedad.message}`);
        setCargando(false);
        return;
      }

      setNovedad(novedadData);

      const { data: bitacoraData } = await supabase
        .from("cad_bitacora_novedades")
        .select(
          "id, accion, estado_anterior, estado_nuevo, comentario, created_at"
        )
        .eq("novedad_id", id)
        .order("created_at", { ascending: false });

      setBitacora(bitacoraData ?? []);

      const { data: apoyosData } = await supabase
        .from("cad_apoyos_novedades")
        .select(
          "id, cedula, nombre, distrito, id_puesto_origen, id_puesto_destino, tipo_apoyo, estado_apoyo, observacion, created_at"
        )
        .eq("novedad_id", id)
        .order("created_at", { ascending: false });

      setApoyos(apoyosData ?? []);
      setCargando(false);
    }

    cargarDetalle();
  }, [params.id]);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando detalle de novedad...</p>
      </main>
    );
  }

  if (!novedad) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-slate-300">
            {mensaje || "No se encontró la novedad CAD."}
          </p>

          <a
            href="/cad"
            className="mt-4 inline-block text-sm text-cyan-300 hover:text-cyan-200"
          >
            Volver a CAD
          </a>
        </div>
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
              Novedad {novedad.id_novedad ?? novedad.id}
            </h1>

            <p className="mt-3 text-slate-400">
              Detalle operativo, bitácora y apoyos asociados.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {novedad.estado_novedad !== "CERRADA" ? (
              <button
                type="button"
                onClick={cerrarNovedad}
                disabled={cerrando}
                className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cerrando ? "Cerrando..." : "Cerrar novedad"}
              </button>
            ) : null}

            <a
              href="/cad"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a CAD
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

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Estado</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {novedad.estado_novedad ?? "SIN ESTADO"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Fecha / hora</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {novedad.fecha} {novedad.hora ?? ""}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Distrito / puesto</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {novedad.distrito ?? "-"} / {novedad.id_puesto ?? "-"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold text-cyan-300">Datos principales</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Tipo:</span>{" "}
              {novedad.tipo_novedad ?? "-"}
            </p>

            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Prioridad:</span>{" "}
              {novedad.prioridad ?? "-"}
            </p>

            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Circuito:</span>{" "}
              {novedad.circuito ?? "-"}
            </p>

            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Subcircuito:</span>{" "}
              {novedad.subcircuito ?? "-"}
            </p>

            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Reporta:</span>{" "}
              {novedad.nombre_reporta ?? novedad.cedula_reporta ?? "-"}
            </p>

            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Asignado a:</span>{" "}
              {novedad.asignado_a ?? "-"}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-sm text-slate-500">Descripción</p>
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              {novedad.descripcion ?? "-"}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-sm text-slate-500">Acción tomada</p>
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              {novedad.accion_tomada ?? "-"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold text-cyan-300">Agregar actualización</h2>

          <p className="mt-2 text-sm text-slate-400">
            Registra una acción, seguimiento o comentario operativo sobre esta
            novedad.
          </p>

          <textarea
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
            className="mt-5 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            placeholder="Escribe la actualización de la novedad..."
          />

          <button
            type="button"
            onClick={agregarComentario}
            disabled={guardandoComentario}
            className="mt-4 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardandoComentario ? "Guardando..." : "Guardar actualización"}
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold text-cyan-300">Bitácora</h2>
              <p className="mt-1 text-sm text-slate-400">
                Total: {bitacora.length}
              </p>
            </div>

            {bitacora.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-400">
                No hay registros de bitácora asociados.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {bitacora.map((registro) => (
                  <div key={registro.id} className="p-5">
                    <p className="font-semibold text-cyan-300">
                      {registro.accion}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(registro.created_at).toLocaleString()}
                    </p>

                    <p className="mt-3 text-sm text-slate-300">
                      {registro.comentario ?? "-"}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {registro.estado_anterior ?? "-"} →{" "}
                      {registro.estado_nuevo ?? "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold text-cyan-300">Apoyos</h2>
              <p className="mt-1 text-sm text-slate-400">
                Total: {apoyos.length}
              </p>
            </div>

            {apoyos.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-400">
                No hay apoyos asociados.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {apoyos.map((apoyo) => (
                  <div key={apoyo.id} className="p-5">
                    <p className="font-semibold text-cyan-300">
                      {apoyo.nombre ?? apoyo.cedula ?? "-"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(apoyo.created_at).toLocaleString()}
                    </p>

                    <p className="mt-3 text-sm text-slate-300">
                      {apoyo.tipo_apoyo ?? "-"} / {apoyo.estado_apoyo ?? "-"}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {apoyo.id_puesto_origen ?? "-"} →{" "}
                      {apoyo.id_puesto_destino ?? "-"}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      {apoyo.observacion ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}