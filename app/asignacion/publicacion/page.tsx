"use client";

import { useState } from "react";

export default function PublicacionDistributivoPage() {
  const [fecha, setFecha] = useState("");
  const [observacion, setObservacion] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function publicarDistributivo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fecha) {
      setMensaje("Selecciona la fecha del distributivo.");
      return;
    }

    setPublicando(true);
    setMensaje("");

    try {
      const response = await fetch("/api/distributivos/publicar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha,
          observacion,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensaje(data.error ?? "No se pudo publicar el distributivo.");
        return;
      }

      setMensaje(data.mensaje ?? "Distributivo publicado correctamente.");
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Error inesperado publicando distributivo."
      );
    } finally {
      setPublicando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
          CACM-G
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Publicación de distributivo
        </h1>

        <p className="mt-3 text-slate-400">
          Publica la distribución operativa de una fecha para habilitar la
          consulta pública del agente.
        </p>

        <form
          onSubmit={publicarDistributivo}
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        >
          <div>
            <label className="text-sm font-medium text-slate-300">
              Fecha del distributivo
            </label>

            <input
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-slate-300">
              Observación
            </label>

            <textarea
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
              placeholder="Ej: Distributivo revisado y autorizado para consulta."
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={publicando}
            className="mt-5 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publicando ? "Publicando..." : "Publicar distributivo"}
          </button>
        </form>

        {mensaje ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            {mensaje}
          </div>
        ) : null}

        <div className="mt-6">
          <a
            href="/asignacion"
            className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Volver a asignación
          </a>
        </div>
      </section>
    </main>
  );
}