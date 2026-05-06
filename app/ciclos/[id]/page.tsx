"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

function textoEstadoDia(valor: string) {
  const texto = valor.toUpperCase().trim();

  if (texto === "X") return "TRABAJO";
  if (texto === "D") return "DESCANSO";
  if (texto === "T") return "TRABAJO";

  return valor;
}

export default function DetalleCicloPage() {
  const params = useParams<{ id: string }>();

  const [ciclo, setCiclo] = useState<CicloTrabajo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarCiclo() {
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
        .eq("id", params.id)
        .single<CicloTrabajo>();

      if (error) {
        setMensaje(`Error al cargar ciclo: ${error.message}`);
        setCargando(false);
        return;
      }

      setCiclo(data);
      setCargando(false);
    }

    cargarCiclo();
  }, [params.id]);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-300">Cargando ciclo...</p>
      </main>
    );
  }

  if (!ciclo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-slate-300">
            {mensaje || "No se encontró el ciclo solicitado."}
          </p>

          <a
            href="/ciclos"
            className="mt-4 inline-block text-sm text-cyan-300 hover:text-cyan-200"
          >
            Volver a ciclos
          </a>
        </div>
      </main>
    );
  }

  const dias = ordenarDias(ciclo.dias_plan);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
              CACM-G
            </p>

            <h1 className="mt-4 text-3xl font-bold">
              {ciclo.mes ?? "-"} {ciclo.anio ?? ""} / {ciclo.grupo ?? "-"}
            </h1>

            <p className="mt-3 text-slate-400">
              Detalle ampliado del ciclo {ciclo.nombre_ciclo}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/ciclos"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Volver a ciclos
            </a>

            <a
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Dashboard
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Ciclo</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {ciclo.nombre_ciclo}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Grupo</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {ciclo.grupo ?? "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Días trabajo</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {ciclo.dias_trabajo ?? "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Días descanso</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {ciclo.dias_descanso ?? "-"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-semibold text-cyan-300">
            Calendario mensual del grupo
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {ciclo.descripcion ?? "Planificación mensual del grupo."}
          </p>

          {dias.length === 0 ? (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Este ciclo no tiene planificación diaria cargada.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
              {dias.map(([dia, valor]) => (
                <div
                  key={`${ciclo.id}-${dia}`}
                  className={`rounded-2xl border p-5 ${claseEstadoDia(valor)}`}
                >
                  <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    {etiquetaDia(dia)}
                  </p>

                  <p className="mt-3 text-xl font-bold">
                    {textoEstadoDia(valor || "-")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}