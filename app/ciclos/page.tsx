"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CicloTrabajo = {
  id: string;
  nombre_ciclo: string;
  tipo_ciclo: string | null;
  anio: number | null;
  mes_numero: number | null;
  mes: string | null;
  grupo: string | null;
  dias_trabajo: number | null;
  dias_descanso: number | null;
  dias_plan: Record<string, string> | null;
  descripcion: string | null;
  estado: string | null;
  created_at: string;
};

function etiquetaDia(clave: string) {
  return clave.replace("dia_", "Día ");
}

function ordenarDias(diasPlan: Record<string, string> | null) {
  if (!diasPlan) return [];

  return Object.entries(diasPlan).sort(([diaA], [diaB]) => {
    const numeroA = Number(diaA.replace("dia_", ""));
    const numeroB = Number(diaB.replace("dia_", ""));
    return numeroA - numeroB;
  });
}

function claseEstadoDia(valor: string) {
  const texto = valor.toUpperCase().trim();

  if (
    texto.includes("DESCANSO") ||
    texto === "D" ||
    texto.includes("LIBRE")
  ) {
    return "border-emerald-800 bg-emerald-950/40 text-emerald-300";
  }

  if (
    texto.includes("TRABAJO") ||
    texto === "T" ||
    texto === "X" ||
    texto.includes("SERVICIO")
  ) {
    return "border-cyan-800 bg-cyan-950/40 text-cyan-300";
  }

  if (texto.includes("NOCHE") || texto.includes("NOCTURNO")) {
    return "border-indigo-800 bg-indigo-950/40 text-indigo-300";
  }

  return "border-slate-800 bg-slate-950 text-slate-300";
}

function obtenerMesNumeroSeguro(ciclo: CicloTrabajo) {
  if (ciclo.mes_numero) return ciclo.mes_numero;

  const texto = (ciclo.mes ?? "").toUpperCase();

  const meses: Record<string, number> = {
    ENERO: 1,
    FEBRERO: 2,
    MARZO: 3,
    ABRIL: 4,
    MAYO: 5,
    JUNIO: 6,
    JULIO: 7,
    AGOSTO: 8,
    SEPTIEMBRE: 9,
    SETIEMBRE: 9,
    OCTUBRE: 10,
    NOVIEMBRE: 11,
    DICIEMBRE: 12,
  };

  for (const [nombre, numero] of Object.entries(meses)) {
    if (texto.includes(nombre)) return numero;
  }

  return 99;
}

function obtenerNumeroGrupo(grupo: string | null) {
  const texto = (grupo ?? "").toUpperCase().trim();
  const match = texto.match(/^G(\d+)$/);

  if (match) {
    return Number(match[1]);
  }

  return 999;
}

function ordenarCiclos(ciclos: CicloTrabajo[]) {
  return [...ciclos].sort((a, b) => {
    const anioA = a.anio ?? 2026;
    const anioB = b.anio ?? 2026;

    if (anioA !== anioB) return anioA - anioB;

    const mesA = obtenerMesNumeroSeguro(a);
    const mesB = obtenerMesNumeroSeguro(b);

    if (mesA !== mesB) return mesA - mesB;

    const grupoA = obtenerNumeroGrupo(a.grupo);
    const grupoB = obtenerNumeroGrupo(b.grupo);

    if (grupoA !== grupoB) return grupoA - grupoB;

    return a.nombre_ciclo.localeCompare(b.nombre_ciclo);
  });
}

function textoEstadoDia(valor: string) {
  const texto = valor.toUpperCase().trim();

  if (texto === "X") return "TRABAJO";
  if (texto === "D") return "DESCANSO";
  if (texto === "T") return "TRABAJO";

  return valor;
}

export default function CiclosPage() {
  const [ciclos, setCiclos] = useState<CicloTrabajo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroCiclo, setFiltroCiclo] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");

  useEffect(() => {
    async function cargarCiclos() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("ciclos_trabajo")
        .select(
  "id, nombre_ciclo, tipo_ciclo, anio, mes_numero, mes, grupo, dias_trabajo, dias_descanso, dias_plan, descripcion, estado, created_at"
)
        .order("mes", { ascending: true })
        .order("grupo", { ascending: true })
        .order("nombre_ciclo", { ascending: true });

      if (error) {
        setMensaje(`Error al cargar ciclos: ${error.message}`);
        setCargando(false);
        return;
      }

      setCiclos(data ?? []);
      setCargando(false);
    }

    cargarCiclos();
  }, []);

  const ciclosFiltrados = ordenarCiclos(
  ciclos.filter((ciclo) => {
    const coincideCiclo = ciclo.nombre_ciclo
      .toLowerCase()
      .includes(filtroCiclo.toLowerCase().trim());

    const coincideMes = (ciclo.mes ?? "")
      .toLowerCase()
      .includes(filtroMes.toLowerCase().trim());

    const coincideGrupo = (ciclo.grupo ?? "")
      .toLowerCase()
      .includes(filtroGrupo.toLowerCase().trim());

    return coincideCiclo && coincideMes && coincideGrupo;
  })
);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando ciclos...</p>
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

            <h1 className="mt-4 text-3xl font-bold">Calendario de ciclos</h1>

            <p className="mt-3 text-slate-400">
              Visualización mensual por grupo, ciclo y planificación diaria.
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

        <div className="mt-8 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por ciclo
            </label>
            <input
              value={filtroCiclo}
              onChange={(event) => setFiltroCiclo(event.target.value)}
              placeholder="Ej: 12-2, 5-2"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por mes
            </label>
            <input
              value={filtroMes}
              onChange={(event) => setFiltroMes(event.target.value)}
              placeholder="Ej: MARZO, ABRIL"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Filtrar por grupo
            </label>
            <input
              value={filtroGrupo}
              onChange={(event) => setFiltroGrupo(event.target.value)}
              placeholder="Ej: G1, G2, G3"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-400">
          Total mostrado: {ciclosFiltrados.length} de {ciclos.length}
        </div>

        {ciclosFiltrados.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-10 text-center text-slate-400">
            No hay ciclos para mostrar.
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            {ciclosFiltrados.map((ciclo) => {
              const dias = ordenarDias(ciclo.dias_plan);

              return (
                <article
                  key={ciclo.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-cyan-300">
                        {ciclo.mes ?? "-"} / {ciclo.grupo ?? "-"} /{" "}
                        {ciclo.nombre_ciclo}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400">
                        {ciclo.descripcion ??
                          "Planificación mensual del grupo."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 font-semibold text-cyan-300">
                        Trabajo: {ciclo.dias_trabajo ?? "-"}
                      </span>

                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-300">
                        Descanso: {ciclo.dias_descanso ?? "-"}
                      </span>

                      <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-300">
                        {ciclo.estado ?? "SIN ESTADO"}
                      </span>
                    </div>
                  </div>

                  {dias.length === 0 ? (
                    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                      Este ciclo no tiene planificación diaria cargada.
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10">
                      {dias.map(([dia, valor]) => (
                        <div
                          key={`${ciclo.id}-${dia}`}
                          className={`rounded-xl border p-3 ${claseEstadoDia(
                            valor
                          )}`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                            {etiquetaDia(dia)}
                          </p>

                          <p className="mt-2 text-sm font-bold">
                            {textoEstadoDia(valor || "-")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}