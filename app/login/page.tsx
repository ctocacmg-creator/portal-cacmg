"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);
    setMensaje("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje("Credenciales inválidas o usuario no autorizado.");
      setCargando(false);
      return;
    }

    setMensaje("Inicio de sesión correcto.");
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
          CACM-G
        </p>

        <h1 className="mt-4 text-3xl font-bold">Ingreso administrativo</h1>

        <p className="mt-3 text-sm text-slate-400">
          Acceso al Portal del Agente para gestión operativa.
        </p>

        <form onSubmit={iniciarSesion} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-300">
              Correo institucional
            </label>
            <input
              type="email"
              required
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Contraseña
            </label>
            <input
              type="password"
              required
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {mensaje ? (
            <p className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              {mensaje}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? "Validando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}