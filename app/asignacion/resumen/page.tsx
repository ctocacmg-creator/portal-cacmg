"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ResumenOperativo = {
  asignacionesActivas: number;
  reportesPendientes: number;
  reportesUrgentes: number;
  distributivosPublicados: number;
  puestosConDeficit: number;
  personalDisponibleHoy: number;
};

type ReporteReciente = {
  id: string;
  cedula: string;
  nombres: string | null;
  grupo: string | null;
  tipo_solicitud: string;
  prioridad: string;
  estado: string;
  created_at: string;
};

type DistributivoPublicado = {
  id: string;
  fecha: string;
  estado: string;
  observacion: string | null;
  publicado_at: string | null;
};

function fechaHoyISO() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatearFechaHora(valor: string | null) {
  if (!valor) return "-";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

function clasePrioridad(prioridad: string) {
  if (prioridad === "URGENTE") {
    return "bg-red-400 text-slate-950";
  }

  if (prioridad === "ALTA") {
    return "bg-amber-400 text-slate-950";
  }

  if (prioridad === "MEDIA") {
    return "bg-cyan-400 text-slate-950";
  }

  return "bg-slate-600 text-white";
}

function claseEstado(estado: string) {
  if (estado === "PENDIENTE") {
    return "border-amber-700 bg-amber-950/30 text-amber-300";
  }

  if (estado === "EN_REVISION") {
    return "border-cyan-700 bg-cyan-950/30 text-cyan-300";
  }

  if (estado === "RESUELTO") {
    return "border-emerald-700 bg-emerald-950/30 text-emerald-300";
  }

  if (estado === "RECHAZADO") {
    return "border-red-700 bg-red-950/30 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

export default function ResumenAsignacionPage() {
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [resumen, setResumen] = useState<ResumenOperativo>({
    asignacionesActivas: 0,
    reportesPendientes: 0,
    reportesUrgentes: 0,
    distributivosPublicados: 0,
    puestosConDeficit: 0,
    personalDisponibleHoy: 0,
  });
  const [reportesRecientes, setReportesRecientes] = useState<ReporteReciente[]>(
    []
  );
  const [distributivos, setDistributivos] = useState<DistributivoPublicado[]>(
    []
  );

  useEffect(() => {
    cargarResumen();
  }, []);

  async function contarTabla(
    tabla: string,
    filtros?: (query: any) => any
  ): Promise<number> {
    let query = supabase.from(tabla).select("id", {
      count: "exact",
      head: true,
    });

    if (filtros) {
      query = filtros(query);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Error contando ${tabla}: ${error.message}`);
    }

    return count ?? 0;
  }

  async function cargarResumen() {
    setCargando(true);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    try {
      const hoy = fechaHoyISO();

      const [
        asignacionesActivas,
        reportesPendientes,
        reportesUrgentes,
        distributivosPublicados,
      ] = await Promise.all([
        contarTabla("asignaciones", (query) =>
          query.eq("estado_asignacion", "ACTIVO")
        ),
        contarTabla("reportes_agente", (query) =>
          query.in("estado", ["PENDIENTE", "EN_REVISION"])
        ),
        contarTabla("reportes_agente", (query) =>
          query.eq("prioridad", "URGENTE").in("estado", [
            "PENDIENTE",
            "EN_REVISION",
          ])
        ),
        contarTabla("distributivos_publicados", (query) =>
          query.eq("estado", "PUBLICADO")
        ),
      ]);

      let puestosConDeficit = 0;
      const { data: deficitData, error: errorDeficit } = await supabase.rpc(
        "fn_puestos_con_deficit"
      );

      if (!errorDeficit) {
        puestosConDeficit = (deficitData ?? []).length;
      }

      let personalDisponibleHoy = 0;
      const { data: disponiblesData, error: errorDisponibles } =
        await supabase.rpc("fn_personal_disponible_en_fecha", {
          p_fecha: hoy,
        });

      if (!errorDisponibles) {
        personalDisponibleHoy = (disponiblesData ?? []).filter(
          (item: { disponible?: boolean | null }) => item.disponible
        ).length;
      }

      const { data: reportesData, error: errorReportes } = await supabase
        .from("reportes_agente")
        .select(
          "id, cedula, nombres, grupo, tipo_solicitud, prioridad, estado, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (errorReportes) {
        throw new Error(`Error cargando reportes: ${errorReportes.message}`);
      }

      const { data: distributivosData, error: errorDistributivos } =
        await supabase
          .from("distributivos_publicados")
          .select("id, fecha, estado, observacion, publicado_at")
          .order("fecha", { ascending: false })
          .limit(5);

      if (errorDistributivos) {
        throw new Error(
          `Error cargando distributivos: ${errorDistributivos.message}`
        );
      }

      setResumen({
        asignacionesActivas,
        reportesPendientes,
        reportesUrgentes,
        distributivosPublicados,
        puestosConDeficit,
        personalDisponibleHoy,
      });

      setReportesRecientes((reportesData ?? []) as ReporteReciente[]);
      setDistributivos(
        (distributivosData ?? []) as DistributivoPublicado[]
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Error cargando resumen operativo."
      );
    } finally {
      setCargando(false);
    }
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando resumen operativo...</p>
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

            <h1 className="mt-4 text-3xl font-bold">Resumen operativo</h1>

            <p className="mt-3 text-slate-400">
              Vista consolidada de asignaciones, distributivos y novedades del
              Portal del Agente.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={cargarResumen}
              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-300 hover:border-cyan-400 hover:text-cyan-200"
            >
              Actualizar
            </button>

            <a
              href="/asignacion"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a asignación
            </a>
          </div>
        </div>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Indicador
            titulo="Asignaciones activas"
            valor={resumen.asignacionesActivas}
            descripcion="Personal actualmente asignado."
            color="cyan"
          />

          <Indicador
            titulo="Reportes pendientes"
            valor={resumen.reportesPendientes}
            descripcion="Pendientes o en revisión."
            color="amber"
          />

          <Indicador
            titulo="Reportes urgentes"
            valor={resumen.reportesUrgentes}
            descripcion="Urgentes sin cerrar."
            color="red"
          />

          <Indicador
            titulo="Distributivos publicados"
            valor={resumen.distributivosPublicados}
            descripcion="Fechas habilitadas para consulta."
            color="emerald"
          />

          <Indicador
            titulo="Puestos con déficit"
            valor={resumen.puestosConDeficit}
            descripcion="Puestos que requieren cobertura."
            color="purple"
          />

          <Indicador
            titulo="Disponibles hoy"
            valor={resumen.personalDisponibleHoy}
            descripcion="Personal disponible según ciclo y restricciones."
            color="slate"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-cyan-300">
                    Reportes recientes
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Últimas novedades enviadas por agentes.
                  </p>
                </div>

                <a
                  href="/asignacion/reportes-agente"
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Ver todos
                </a>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {reportesRecientes.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400">
                  No hay reportes recientes.
                </div>
              ) : (
                reportesRecientes.map((reporte) => (
                  <div key={reporte.id} className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${claseEstado(
                          reporte.estado
                        )}`}
                      >
                        {reporte.estado}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${clasePrioridad(
                          reporte.prioridad
                        )}`}
                      >
                        {reporte.prioridad}
                      </span>
                    </div>

                    <p className="mt-3 font-semibold text-slate-200">
                      {reporte.tipo_solicitud}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {reporte.nombres ?? "-"} · {reporte.cedula} · Grupo{" "}
                      {reporte.grupo ?? "-"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatearFechaHora(reporte.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-emerald-300">
                    Distributivos publicados
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Últimas fechas habilitadas para consulta pública.
                  </p>
                </div>

                <a
                  href="/asignacion/publicacion"
                  className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  Publicar
                </a>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {distributivos.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400">
                  No hay distributivos publicados.
                </div>
              ) : (
                distributivos.map((item) => (
                  <div key={item.id} className="px-5 py-4">
                    <p className="font-semibold text-slate-200">
                      Fecha: {item.fecha}
                    </p>

                    <p className="mt-1 text-sm text-emerald-300">
                      Estado: {item.estado}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {item.observacion ?? "Sin observación."}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Publicado: {formatearFechaHora(item.publicado_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Indicador({
  titulo,
  valor,
  descripcion,
  color,
}: {
  titulo: string;
  valor: number;
  descripcion: string;
  color: "cyan" | "amber" | "red" | "emerald" | "purple" | "slate";
}) {
  const colores = {
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    red: "text-red-300",
    emerald: "text-emerald-300",
    purple: "text-purple-300",
    slate: "text-slate-300",
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className={`mt-2 text-4xl font-bold ${colores[color]}`}>{valor}</p>
      <p className="mt-2 text-sm text-slate-500">{descripcion}</p>
    </div>
  );
}