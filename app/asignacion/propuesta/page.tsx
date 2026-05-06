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
  propuesta_id: string;
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

type PersonaAsignacion = {
  id: string;
  cedula: string;
  nombres: string | null;
  grupo: string | null;
  area: string | null;
};

type PuestoAsignacion = {
  id: string;
  id_puesto: string;
};

export default function PropuestaAsignacionPage() {
  const [fecha, setFecha] = useState("");
  const [disponibles, setDisponibles] = useState<Disponible[]>([]);
  const [puestosDeficit, setPuestosDeficit] = useState<PuestoDeficit[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [cedulaManual, setCedulaManual] = useState("");
  const [puestoManual, setPuestoManual] = useState("");
  const [funcionManual, setFuncionManual] = useState("SERVICIO OPERATIVO");
  const [horarioManual, setHorarioManual] = useState("");
  const [observacionManual, setObservacionManual] = useState(
    "Agregado manualmente a propuesta."
  );

  async function cargarBasePropuesta(fechaConsulta: string) {
    const { data: disponiblesData, error: errorDisponibles } =
      await supabase.rpc("fn_personal_disponible_en_fecha", {
        p_fecha: fechaConsulta,
      });

    if (errorDisponibles) {
      throw new Error(
        `Error consultando personal disponible: ${errorDisponibles.message}`
      );
    }

    const { data: puestosDeficitData, error: errorPuestosDeficit } =
      await supabase.rpc("fn_puestos_con_deficit");

    if (errorPuestosDeficit) {
      throw new Error(
        `Error consultando puestos con déficit: ${errorPuestosDeficit.message}`
      );
    }

    const { data: puestosData, error: errorCatalogoPuestos } = await supabase
      .from("puestos_operativos")
      .select("id, id_puesto, distrito")
      .order("distrito", { ascending: true })
      .order("id_puesto", { ascending: true });

    if (errorCatalogoPuestos) {
      throw new Error(
        `Error cargando catálogo de puestos: ${errorCatalogoPuestos.message}`
      );
    }

    const personalDisponible = ((disponiblesData ?? []) as Disponible[]).filter(
      (persona) => persona.disponible
    );

    const puestosConDeficit = (puestosDeficitData ?? []) as PuestoDeficit[];
    const catalogoPuestos = (puestosData ?? []) as Puesto[];

    setDisponibles(personalDisponible);
    setPuestosDeficit(puestosConDeficit);
    setPuestos(catalogoPuestos);

    return {
      personalDisponible,
      puestosConDeficit,
      catalogoPuestos,
    };
  }

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

    try {
      const { personalDisponible, puestosConDeficit } =
        await cargarBasePropuesta(fecha);

      const propuestaGenerada: Propuesta[] = [];
      let indicePersona = 0;
      let contadorPropuesta = 0;

      for (const puesto of puestosConDeficit) {
        const deficit = Number(puesto.deficit ?? 0);

        for (let i = 0; i < deficit; i++) {
          const persona = personalDisponible[indicePersona];

          if (!persona) break;

          contadorPropuesta++;

          propuestaGenerada.push({
            propuesta_id: `${persona.cedula ?? "SIN_CEDULA"}-${
              puesto.id_puesto
            }-${contadorPropuesta}`,
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

      setPropuestas(propuestaGenerada);

      setMensaje(
        `Propuesta generada. Disponibles: ${personalDisponible.length}. Puestos con déficit: ${puestosConDeficit.length}. Asignaciones propuestas: ${propuestaGenerada.length}.`
      );
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "Error generando propuesta.");
    } finally {
      setGenerando(false);
    }
  }

  function actualizarPropuesta(
    propuestaId: string,
    campo: keyof Pick<
      Propuesta,
      "id_puesto" | "funcion" | "horario" | "observacion"
    >,
    valor: string
  ) {
    setPropuestas((actual) =>
      actual.map((propuesta) => {
        if (propuesta.propuesta_id !== propuestaId) return propuesta;

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

  function quitarPropuesta(propuestaId: string) {
    const confirmar = window.confirm(
      "¿Deseas quitar esta persona de la propuesta?"
    );

    if (!confirmar) return;

    setPropuestas((actual) =>
      actual.filter((propuesta) => propuesta.propuesta_id !== propuestaId)
    );
  }

  async function agregarManualAPropuesta() {
    if (!fecha) {
      setMensaje("Selecciona una fecha antes de agregar manualmente.");
      return;
    }

    const cedulaLimpia = cedulaManual.trim();
    const puestoLimpio = puestoManual.trim().toUpperCase();

    if (!cedulaLimpia || !puestoLimpio) {
      setMensaje("Ingresa cédula y puesto para agregar manualmente.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    setMensaje("");

    try {
      let personalDisponible = disponibles;
      let catalogoPuestos = puestos;

      if (personalDisponible.length === 0 || catalogoPuestos.length === 0) {
        const base = await cargarBasePropuesta(fecha);
        personalDisponible = base.personalDisponible;
        catalogoPuestos = base.catalogoPuestos;
      }

      const persona = personalDisponible.find(
        (item) => item.cedula?.trim() === cedulaLimpia
      );

      if (!persona) {
        setMensaje(
          "No se encontró esa cédula dentro del personal disponible para la fecha seleccionada."
        );
        return;
      }

      const yaExiste = propuestas.some(
        (item) => item.cedula.trim() === cedulaLimpia
      );

      if (yaExiste) {
        setMensaje("Esa persona ya está dentro de la propuesta actual.");
        return;
      }

      const puesto = catalogoPuestos.find(
        (item) => item.id_puesto.trim().toUpperCase() === puestoLimpio
      );

      if (!puesto) {
        setMensaje("El puesto seleccionado no existe en el catálogo.");
        return;
      }

      const nuevaPropuesta: Propuesta = {
        propuesta_id: `MANUAL-${cedulaLimpia}-${puesto.id_puesto}-${Date.now()}`,
        cedula: persona.cedula ?? "",
        nombres: persona.nombres ?? "",
        grupo: persona.grupo,
        area: persona.area,
        id_puesto: puesto.id_puesto,
        distrito: puesto.distrito,
        fecha_inicio: fecha,
        estado_ciclo: persona.estado_ciclo,
        funcion: funcionManual.trim().toUpperCase() || "SERVICIO OPERATIVO",
        horario: horarioManual.trim().toUpperCase(),
        observacion: observacionManual.trim() || "Agregado manualmente a propuesta.",
      };

      setPropuestas((actual) => [...actual, nuevaPropuesta]);
      setCedulaManual("");
      setMensaje(`Agregado manualmente: ${nuevaPropuesta.nombres}.`);
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Error agregando manualmente a la propuesta."
      );
    }
  }

  async function aplicarPropuesta() {
    if (aplicando) return;

    if (propuestas.length === 0) {
      setMensaje("No hay propuestas para aplicar.");
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas aplicar ${propuestas.length} asignaciones propuestas? Esta acción creará asignaciones reales.`
    );

    if (!confirmar) return;

    setAplicando(true);
    setMensaje("");

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const asignacionesParaInsertar = [];

    for (const propuesta of propuestas) {
      const cedulaLimpia = propuesta.cedula.trim();
      const idPuestoLimpio = propuesta.id_puesto.trim().toUpperCase();

      if (!cedulaLimpia || !idPuestoLimpio || !propuesta.fecha_inicio) {
        setMensaje(
          `Propuesta inválida para ${
            propuesta.nombres || propuesta.cedula
          }. Falta cédula, puesto o fecha.`
        );
        setAplicando(false);
        return;
      }

      const { data: persona, error: errorPersona } = await supabase
        .from("personas")
        .select("id, cedula, nombres, grupo, area")
        .eq("cedula", cedulaLimpia)
        .single<PersonaAsignacion>();

      if (errorPersona || !persona) {
        setMensaje(`No se encontró la persona con cédula ${cedulaLimpia}.`);
        setAplicando(false);
        return;
      }

      const { data: puesto, error: errorPuesto } = await supabase
        .from("puestos_operativos")
        .select("id, id_puesto")
        .eq("id_puesto", idPuestoLimpio)
        .single<PuestoAsignacion>();

      if (errorPuesto || !puesto) {
        setMensaje(`No se encontró el puesto ${idPuestoLimpio}.`);
        setAplicando(false);
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
          `No se puede aplicar. ${
            persona.nombres ?? persona.cedula
          } ya tiene asignación activa en ${asignacionActiva.id_puesto}.`
        );
        setAplicando(false);
        return;
      }

      asignacionesParaInsertar.push({
        persona_id: persona.id,
        puesto_id: puesto.id,
        cedula: persona.cedula,
        id_puesto: puesto.id_puesto,
        grupo: persona.grupo,
        area: persona.area,
        funcion: propuesta.funcion.trim().toUpperCase() || null,
        horario: propuesta.horario.trim().toUpperCase() || null,
        observacion: propuesta.observacion.trim() || null,
        fecha_inicio: propuesta.fecha_inicio,
        estado_asignacion: "ACTIVO",
        creado_por: sessionData.session.user.id,
      });
    }

    const { error: errorInsert } = await supabase
      .from("asignaciones")
      .insert(asignacionesParaInsertar);

    if (errorInsert) {
      setMensaje(`Error aplicando propuesta: ${errorInsert.message}`);
      setAplicando(false);
      return;
    }

    await supabase.from("auditoria").insert({
      modulo: "ASIGNACION",
      accion: "PROPUESTA_AUTOMATICA_APLICADA",
      usuario_id: sessionData.session.user.id,
      cedula: null,
      detalle: {
        fecha,
        total_asignaciones: asignacionesParaInsertar.length,
        puestos: asignacionesParaInsertar.map((item) => item.id_puesto),
        cedulas: asignacionesParaInsertar.map((item) => item.cedula),
      },
    });

    setMensaje(
      `Propuesta aplicada correctamente. Asignaciones creadas: ${asignacionesParaInsertar.length}.`
    );

    setPropuestas([]);
    setAplicando(false);
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

  const disponiblesFiltradosManual = disponibles
    .filter((persona) => {
      const texto = [
        persona.cedula,
        persona.nombres,
        persona.grupo,
        persona.area,
        persona.estado_ciclo,
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(cedulaManual.toLowerCase().trim());
    })
    .slice(0, 10);

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
              Genera una propuesta inicial, agrega personal manualmente y afina
              la distribución antes de aplicar cambios.
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
            disabled={generando || aplicando}
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

        <div className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-5">
          <h2 className="font-semibold text-emerald-300">
            Agregar manualmente a propuesta
          </h2>

          <p className="mt-2 text-sm text-slate-300">
            Usa este bloque cuando no haya déficit o cuando necesites afinar la
            distribución manualmente.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Cédula / búsqueda
              </label>
              <input
                value={cedulaManual}
                onChange={(event) => setCedulaManual(event.target.value)}
                placeholder="Ej: 0929500890"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Puesto
              </label>
              <select
                value={puestoManual}
                onChange={(event) => setPuestoManual(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >
                <option value="">Seleccionar puesto</option>
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
                value={funcionManual}
                onChange={(event) => setFuncionManual(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Horario
              </label>
              <input
                value={horarioManual}
                onChange={(event) => setHorarioManual(event.target.value)}
                placeholder="Ej: 07H00-15H00"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Observación
              </label>
              <input
                value={observacionManual}
                onChange={(event) => setObservacionManual(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {cedulaManual && disponiblesFiltradosManual.length > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Coincidencias disponibles
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {disponiblesFiltradosManual.map((persona) => (
                  <button
                    key={persona.persona_id}
                    type="button"
                    onClick={() => setCedulaManual(persona.cedula ?? "")}
                    className="rounded-xl border border-slate-800 px-3 py-2 text-left text-sm text-slate-300 hover:border-emerald-500 hover:text-emerald-300"
                  >
                    <span className="font-semibold">
                      {persona.cedula ?? "-"}
                    </span>{" "}
                    - {persona.nombres ?? "-"} / {persona.grupo ?? "-"} /{" "}
                    {persona.estado_ciclo ?? "-"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={agregarManualAPropuesta}
            disabled={aplicando || generando}
            className="mt-5 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Agregar a propuesta
          </button>
        </div>

        {propuestas.length > 0 ? (
          <div className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-emerald-300">
                  Aplicar propuesta revisada
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Esta acción creará asignaciones reales con todas las filas de
                  la propuesta actual.
                </p>
              </div>

              <button
                type="button"
                onClick={aplicarPropuesta}
                disabled={aplicando || generando}
                className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aplicando ? "Aplicando..." : "Aplicar propuesta"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-cyan-300">
              Afinación manual de propuesta
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Cambia el puesto, función, horario u observación antes de aplicar
              la propuesta.
            </p>
          </div>

          {propuestasFiltradas.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              No hay propuestas generadas.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {propuestasFiltradas.map((propuesta) => (
                <div key={propuesta.propuesta_id} className="p-5">
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
                            propuesta.propuesta_id,
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
                            propuesta.propuesta_id,
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
                            propuesta.propuesta_id,
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
                            propuesta.propuesta_id,
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
                      onClick={() => quitarPropuesta(propuesta.propuesta_id)}
                      disabled={aplicando}
                      className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Quitar de propuesta
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