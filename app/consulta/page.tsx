"use client";

import { useEffect, useMemo, useState } from "react";

const VERSION_DOCUMENTO = "DISPOSICIONES_CONSULTA_V1_2026";

type PersonaDetalle = Record<string, unknown>;

type AgenteConsulta = {
  cedula: string;
  nombres: string | null;
  grupo: string | null;
  area: string | null;
  detalle: PersonaDetalle;
};

type AsignacionConsulta = Record<string, unknown> & {
  cedula: string;
  grupo: string | null;
  area: string | null;
  id_puesto: string;
  funcion: string | null;
  horario: string | null;
  observacion: string | null;
  fecha_inicio: string;
  estado_asignacion: string;
  created_at: string;
};

type DiaCalendario = {
  dia: number;
  nombreDia: string;
  valor: string;
  trabaja: boolean;
  estado: string;
};

type CalendarioConsulta = {
  mes: string;
  anio: number;
  dias: DiaCalendario[];
  dias_trabajo: number;
  dias_descanso: number;
  ciclo_encontrado?: boolean;
};

type ResultadoConsulta = {
  agente: AgenteConsulta;
  asignacion: AsignacionConsulta | null;
  calendarios: {
    actual: CalendarioConsulta;
    siguiente: CalendarioConsulta;
  };
  estado_operativo: {
    hoy: string;
    manana: string;
    dias_trabajo_mes: number;
    dias_libres_mes: number;
    avance_mes: number;
    ciclo_actual_encontrado?: boolean;
    ciclo_siguiente_encontrado?: boolean;
  };
  distributivo?: {
    publicado: boolean;
    fecha: string;
    publicado_at?: string | null;
  };
  mensaje: string;
};

type TipoMensaje = "ok" | "error" | "";

function generarNumeroCaptcha() {
  return Math.floor(Math.random() * 8) + 2;
}

function texto(valor: unknown, fallback = "N/A") {
  const salida = String(valor ?? "").trim();
  return salida || fallback;
}

function normalizarClave(valor: string) {
  return valor
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function campo(persona: PersonaDetalle, posibles: string[], fallback = "N/A") {
  const entries = Object.entries(persona);
  const posiblesNormalizados = posibles.map(normalizarClave);

  for (const [key, value] of entries) {
    if (posiblesNormalizados.includes(normalizarClave(key))) {
      return texto(value, fallback);
    }
  }

  return fallback;
}

function formatearFechaHora(fecha: Date) {
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(fecha);
}

function formatearFecha(valor: unknown) {
  const textoFecha = String(valor ?? "").trim();

  if (!textoFecha || textoFecha === "N/A") return "N/A";

  const fecha = new Date(`${textoFecha}T00:00:00`);

  if (Number.isNaN(fecha.getTime())) return textoFecha;

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function formatearFechaPublicada(valor: unknown) {
  const textoFecha = String(valor ?? "").trim();

  if (!textoFecha) return "N/A";

  const fecha = new Date(`${textoFecha}T00:00:00`);

  if (Number.isNaN(fecha.getTime())) return textoFecha;

  return new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

export default function ConsultaAgentePage() {
  const [cedula, setCedula] = useState("");
  const [codigoValidacion, setCodigoValidacion] = useState("");
  const [aceptaDisposiciones, setAceptaDisposiciones] = useState(false);
  const [captchaA, setCaptchaA] = useState(0);
  const [captchaB, setCaptchaB] = useState(0);
  const [captchaRespuesta, setCaptchaRespuesta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<TipoMensaje>("");
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [modalDisposiciones, setModalDisposiciones] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  const [tipoSolicitud, setTipoSolicitud] = useState("");
  const [detalleReporte, setDetalleReporte] = useState("");
  const [prioridadReporte, setPrioridadReporte] = useState("MEDIA");
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [mensajeReporte, setMensajeReporte] = useState("");

  useEffect(() => {
    renovarCaptcha();

    const intervalo = window.setInterval(() => {
      setAhora(new Date());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  function renovarCaptcha() {
    setCaptchaA(generarNumeroCaptcha());
    setCaptchaB(generarNumeroCaptcha());
    setCaptchaRespuesta("");
  }

  function limpiarFormulario() {
    setCedula("");
    setCodigoValidacion("");
    setAceptaDisposiciones(false);
    setMensaje("");
    setTipoMensaje("");
    setResultado(null);
    setTipoSolicitud("");
    setDetalleReporte("");
    setPrioridadReporte("MEDIA");
    setMensajeReporte("");
    renovarCaptcha();
  }

  const puedeConsultar =
    cedula.replace(/\D/g, "").trim().length >= 8 &&
    codigoValidacion.trim().length > 0 &&
    captchaRespuesta.trim().length > 0 &&
    aceptaDisposiciones &&
    !consultando;

  async function consultarAsignacion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setConsultando(true);
    setMensaje("");
    setTipoMensaje("");
    setResultado(null);
    setMensajeReporte("");

    try {
      const response = await fetch("/api/consulta-agente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cedula,
          codigoValidacion,
          aceptaDisposiciones,
          captchaA,
          captchaB,
          captchaRespuesta,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setTipoMensaje("error");
        setMensaje(data.error ?? "No se pudo realizar la consulta.");
        renovarCaptcha();
        return;
      }

      setResultado(data as ResultadoConsulta);
      setTipoMensaje("ok");
      setMensaje(data.mensaje ?? "Consulta realizada correctamente.");
      renovarCaptcha();
    } catch (error) {
      setTipoMensaje("error");
      setMensaje(
        error instanceof Error
          ? error.message
          : "Error inesperado realizando la consulta."
      );
      renovarCaptcha();
    } finally {
      setConsultando(false);
    }
  }

  const claseMensaje = useMemo(() => {
    if (tipoMensaje === "ok") {
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    if (tipoMensaje === "error") {
      return "border-red-200 bg-red-50 text-red-800";
    }

    return "border-slate-200 bg-white text-slate-700";
  }, [tipoMensaje]);

  const detalle = resultado?.agente.detalle ?? {};
  const asignacion = resultado?.asignacion;
  const nombreAgente =
    resultado?.agente.nombres ??
    campo(
      detalle,
      ["apellidos_y_nombres", "apellidos y nombres"],
      "AGENTE CACM-G"
    );
  const grupoAgente = resultado?.agente.grupo ?? texto(asignacion?.grupo);
  const areaAgente = resultado?.agente.area ?? texto(asignacion?.area);

  async function enviarReporteAgente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resultado) {
      setMensajeReporte("Primero realiza la consulta del agente.");
      return;
    }

    if (!tipoSolicitud) {
      setMensajeReporte("Selecciona el tipo de solicitud.");
      return;
    }

    if (detalleReporte.trim().length < 10) {
      setMensajeReporte("Describe la novedad con al menos 10 caracteres.");
      return;
    }

    setEnviandoReporte(true);
    setMensajeReporte("");

    try {
      const response = await fetch("/api/reportes-agente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cedula: resultado.agente.cedula,
          nombres: nombreAgente,
          grupo: grupoAgente,
          area: areaAgente,
          tipoSolicitud,
          detalle: detalleReporte,
          prioridad: prioridadReporte,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensajeReporte(data.error ?? "No se pudo enviar el reporte.");
        return;
      }

      setMensajeReporte(data.mensaje ?? "Reporte enviado correctamente.");
      setTipoSolicitud("");
      setDetalleReporte("");
      setPrioridadReporte("MEDIA");
    } catch (error) {
      setMensajeReporte(
        error instanceof Error
          ? error.message
          : "Error inesperado enviando reporte."
      );
    } finally {
      setEnviandoReporte(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f7] text-slate-900">
      <header className="bg-[#073763] px-4 py-6 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-300 bg-white shadow-xl">
            <img
              src="/logo.png"
              alt="CACM-G"
              className="h-20 w-20 object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="absolute text-xs font-black text-[#073763]">
              CACM-G
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black">
            PORTAL DEL AGENTE CACM-G
          </h1>

          <p className="mt-1 text-sm font-semibold text-blue-100">
            Cuerpo de Agentes de Control Municipal de Guayaquil
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {!resultado ? (
          <div className="rounded-[28px] bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-3xl font-black">Acceso Institucional</h2>

            <p className="mt-1 text-slate-600">
              Sistema Interno de Gestión Operativa de Personal
            </p>

            <form onSubmit={consultarAsignacion} className="mt-7 space-y-5">
              <CampoFormulario
                label="Cédula"
                value={cedula}
                onChange={setCedula}
                placeholder="Ingrese su número de cédula"
              />

              <CampoFormulario
                label="Código"
                value={codigoValidacion}
                onChange={setCodigoValidacion}
                placeholder="Ingrese su código de validación"
                type="password"
              />

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <label className="font-black">
                  ¿Cuánto es {captchaA} + {captchaB}?
                </label>

                <input
                  value={captchaRespuesta}
                  onChange={(event) => setCaptchaRespuesta(event.target.value)}
                  placeholder="Resultado de la suma"
                  className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#073763]"
                />
              </div>

              <button
                type="button"
                onClick={() => setModalDisposiciones(true)}
                className="flex items-center gap-2 font-black text-[#073763]"
              >
                <span className="h-3 w-3 bg-cyan-400" />
                Ver Disposiciones Generales
              </button>

              <label className="flex items-start gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={aceptaDisposiciones}
                  onChange={(event) =>
                    setAceptaDisposiciones(event.target.checked)
                  }
                  className="mt-1 h-5 w-5"
                />

                <span>
                  He leído y acepto las Disposiciones Generales de Servicio.
                </span>
              </label>

              {mensaje ? (
                <div className={`rounded-xl border px-4 py-3 ${claseMensaje}`}>
                  {mensaje}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!puedeConsultar}
                className="w-full rounded-2xl bg-[#7895b2] px-5 py-4 font-black uppercase text-white shadow transition hover:bg-[#5f7f9f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {consultando ? "Consultando..." : "Ingresar"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <PanelEstado
              nombreAgente={nombreAgente}
              grupo={grupoAgente}
              hoy={resultado.estado_operativo.hoy}
              manana={resultado.estado_operativo.manana}
              diasTrabajo={resultado.estado_operativo.dias_trabajo_mes}
              diasLibres={resultado.estado_operativo.dias_libres_mes}
              avance={resultado.estado_operativo.avance_mes}
              fecha={formatearFechaHora(ahora)}
              onNuevaConsulta={limpiarFormulario}
            />

            {resultado.distributivo ? (
              <div
                className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
                  resultado.distributivo.publicado
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {resultado.distributivo.publicado ? (
                  <>
                    Distributivo publicado para la jornada{" "}
                    {formatearFechaPublicada(resultado.distributivo.fecha)}.
                  </>
                ) : (
                  <>
                    El distributivo de la jornada{" "}
                    {formatearFechaPublicada(resultado.distributivo.fecha)} aún
                    no ha sido publicado.
                  </>
                )}
              </div>
            ) : null}

            {!resultado.estado_operativo.ciclo_actual_encontrado ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
                No se encontró corrida laboral para el grupo {grupoAgente} en el
                mes actual. Verifica que CICLOS tenga el mes y grupo
                correctamente cargados.
              </div>
            ) : null}

            <Seccion titulo="Información Operativa" color="red">
              {!asignacion ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  No existe una asignación activa para la fecha publicada. Se
                  muestra la información del agente y su corrida laboral por
                  grupo.
                </div>
              ) : null}

              <GridDatos>
                <Dato
                  label="Asignación"
                  value={texto(asignacion?.id_puesto)}
                  destaque
                />
                <Dato label="Función" value={texto(asignacion?.funcion)} />
                <Dato label="Horario" value={texto(asignacion?.horario)} />
                <Dato
                  label="Formación"
                  value={campo(
                    detalle,
                    ["lugar_formacion", "lugar de formación"],
                    "N/A"
                  )}
                />
                <Dato
                  label="Consignas"
                  value={campo(detalle, ["consignas"], "N/A")}
                />
                <Dato
                  label="Base legal"
                  value={campo(detalle, ["base_legal", "base legal"], "N/A")}
                />
                <Dato
                  label="Jefe inmediato"
                  value={campo(
                    detalle,
                    [
                      "encargado_jefe_inmediato",
                      "encargado_o_jefe_inmediato",
                      "encargado o jefe inmediato",
                    ],
                    "N/A"
                  )}
                />
                <Dato
                  label="Observación"
                  value={texto(asignacion?.observacion, "Sin observaciones")}
                />
              </GridDatos>
            </Seccion>

            <Seccion titulo="Identificación" color="blue">
              <GridDatos>
                <Dato label="Cédula" value={resultado.agente.cedula} />
                <Dato label="Nombre" value={nombreAgente} />
                <Dato label="Grado" value={campo(detalle, ["grado"])} />
                <Dato label="Grupo" value={grupoAgente} />
                <Dato label="Área" value={areaAgente} />
                <Dato label="Estado" value={campo(detalle, ["estado"])} />
              </GridDatos>
            </Seccion>

            <Seccion titulo="Información Personal" color="green">
              <GridDatos>
                <Dato
                  label="Fecha nacimiento"
                  value={formatearFecha(
                    campo(detalle, ["fecha_nacimiento", "fecha de nacimiento"], "")
                  )}
                />
                <Dato
                  label="Género"
                  value={campo(detalle, ["genero", "género"])}
                />
                <Dato
                  label="Tipo sangre"
                  value={campo(detalle, ["tipo_sangre", "tipo de sangre"])}
                />
                <Dato
                  label="Celular"
                  value={campo(detalle, [
                    "numero_celular",
                    "numero de celular",
                    "celular",
                  ])}
                />
                <Dato
                  label="Correo"
                  value={campo(detalle, [
                    "correo_electronico",
                    "correo electronico",
                  ])}
                />
                <Dato
                  label="Dirección"
                  value={campo(detalle, [
                    "direccion_domiciliaria",
                    "direccion domiciliaria",
                  ])}
                />
                <Dato
                  label="Parroquia residencia"
                  value={campo(detalle, ["parroquia_residencia", "parroquia"])}
                />
                <Dato
                  label="Sector residencia"
                  value={campo(detalle, ["sector_residencia", "sector"])}
                />
              </GridDatos>
            </Seccion>

            <Seccion titulo="Licencias" color="yellow">
              <GridDatos>
                <Dato
                  label="Custodio vehículo"
                  value={campo(detalle, [
                    "custodio_vehiculo",
                    "custodio del vehiculo",
                  ])}
                />
                <Dato
                  label="Tipo licencia"
                  value={campo(detalle, ["tipo_licencia"])}
                />
                <Dato
                  label="Licencia vigente"
                  value={campo(detalle, ["licencia_vigente"])}
                />
                <Dato
                  label="Vencimiento licencia"
                  value={formatearFecha(
                    campo(detalle, ["fecha_vencimiento_licencia"], "")
                  )}
                />
                <Dato
                  label="Tipo A"
                  value={campo(detalle, ["licencia_tipo_a", "licencia tipo a"])}
                />
                <Dato
                  label="Tipo A1"
                  value={campo(detalle, [
                    "licencia_tipo_a1",
                    "licencia tipo a1",
                  ])}
                />
                <Dato
                  label="Tipo B"
                  value={campo(detalle, ["licencia_tipo_b", "licencia tipo b"])}
                />
                <Dato
                  label="Tipo C"
                  value={campo(detalle, ["licencia_tipo_c", "licencia tipo c"])}
                />
                <Dato
                  label="Tipo C1"
                  value={campo(detalle, [
                    "licencia_tipo_c1",
                    "licencia tipo c1",
                  ])}
                />
                <Dato
                  label="Tipo D"
                  value={campo(detalle, ["licencia_tipo_d", "licencia tipo d"])}
                />
                <Dato
                  label="Tipo D1"
                  value={campo(detalle, [
                    "licencia_tipo_d1",
                    "licencia tipo d1",
                  ])}
                />
                <Dato
                  label="Tipo E"
                  value={campo(detalle, ["licencia_tipo_e", "licencia tipo e"])}
                />
                <Dato
                  label="Tipo E1"
                  value={campo(detalle, [
                    "licencia_tipo_e1",
                    "licencia tipo e1",
                  ])}
                />
                <Dato
                  label="Tipo F"
                  value={campo(detalle, ["licencia_tipo_f", "licencia tipo f"])}
                />
                <Dato
                  label="Tipo G"
                  value={campo(detalle, ["licencia_tipo_g", "licencia tipo g"])}
                />
              </GridDatos>
            </Seccion>

            <Seccion titulo="Ausentismo" color="purple">
              <GridDatos>
                <Dato
                  label="Por"
                  value={campo(detalle, ["ausentismo_por", "ausentismo por"])}
                />
                <Dato
                  label="Desde"
                  value={formatearFecha(
                    campo(detalle, ["ausentismo_desde", "ausentismo desde"], "")
                  )}
                />
                <Dato
                  label="Hasta"
                  value={formatearFecha(
                    campo(detalle, ["ausentismo_hasta", "ausentismo hasta"], "")
                  )}
                />
                <Dato
                  label="Nota"
                  value={campo(detalle, ["nota_ausentismo", "nota ausentismo"])}
                />
              </GridDatos>
            </Seccion>

            <Seccion titulo="Calendario Laboral" color="blue">
              <div className="grid gap-6 lg:grid-cols-2">
                <Calendario calendario={resultado.calendarios.actual} />
                <Calendario calendario={resultado.calendarios.siguiente} />
              </div>
            </Seccion>

            <Seccion titulo="Reportar Novedad / Actualizar Datos" color="red">
              <form onSubmit={enviarReporteAgente} className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Tipo de solicitud
                  </label>

                  <select
                    value={tipoSolicitud}
                    onChange={(event) => setTipoSolicitud(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-[#073763]"
                  >
                    <option value="">Seleccione...</option>
                    <option value="NOVEDAD OPERATIVA">Novedad operativa</option>
                    <option value="CORRECCION DATOS">
                      Corrección de datos personales
                    </option>
                    <option value="PROBLEMA ASIGNACION">
                      Problema con asignación
                    </option>
                    <option value="AUSENTISMO">
                      Ausentismo / novedad médica
                    </option>
                    <option value="REVISAR LICENCIA">
                      Revisión de licencia
                    </option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Detalle
                  </label>

                  <textarea
                    value={detalleReporte}
                    onChange={(event) => setDetalleReporte(event.target.value)}
                    placeholder="Describe la novedad o solicitud..."
                    className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-[#073763]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Prioridad
                  </label>

                  <select
                    value={prioridadReporte}
                    onChange={(event) =>
                      setPrioridadReporte(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-[#073763]"
                  >
                    <option value="BAJA">BAJA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="URGENTE">URGENTE</option>
                  </select>
                </div>

                {mensajeReporte ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    {mensajeReporte}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={enviandoReporte}
                  className="w-full rounded-xl bg-[#073763] px-4 py-3 font-black uppercase text-white transition hover:bg-[#052f56] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviandoReporte ? "Enviando reporte..." : "Enviar reporte"}
                </button>
              </form>
            </Seccion>
          </div>
        )}
      </section>

      <footer className="px-4 pb-8 text-center text-xs font-semibold text-slate-500">
        Cuerpo de Agentes de Control Municipal de Guayaquil
      </footer>

      {modalDisposiciones ? (
        <ModalDisposiciones onClose={() => setModalDisposiciones(false)} />
      ) : null}
    </main>
  );
}

function CampoFormulario({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-black">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#073763]"
      />
    </div>
  );
}

function PanelEstado({
  nombreAgente,
  grupo,
  hoy,
  manana,
  diasTrabajo,
  diasLibres,
  avance,
  fecha,
  onNuevaConsulta,
}: {
  nombreAgente: string;
  grupo: string;
  hoy: string;
  manana: string;
  diasTrabajo: number;
  diasLibres: number;
  avance: number;
  fecha: string;
  onNuevaConsulta: () => void;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-xl ring-1 ring-slate-200 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Fecha {fecha}
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Bienvenido {nombreAgente}
          </h2>
        </div>

        <button
          type="button"
          onClick={onNuevaConsulta}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          Nueva consulta
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MiniCard label="Grupo" value={grupo} color="blue" />
        <MiniCard
          label="Hoy"
          value={hoy}
          color={hoy === "TRABAJA" ? "green" : "amber"}
        />
        <MiniCard
          label="Mañana"
          value={manana}
          color={manana === "TRABAJA" ? "green" : "amber"}
        />
        <MiniCard label="D. trabajo" value={String(diasTrabajo)} color="cyan" />
        <MiniCard label="D. libres" value={String(diasLibres)} color="purple" />
        <MiniCard label="Avance mes" value={`${avance}%`} color="slate" />
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
        El estado HOY y MAÑANA corresponde a la corrida laboral del grupo. La
        asignación operativa se mostrará únicamente cuando exista una asignación
        activa para la fecha publicada.
      </div>
    </section>
  );
}

function MiniCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "amber" | "cyan" | "purple" | "slate";
}) {
  const clases = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
    purple: "border-purple-200 bg-purple-50 text-purple-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-2xl border p-4 ${clases[color]}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function Seccion({
  titulo,
  color,
  children,
}: {
  titulo: string;
  color: "red" | "blue" | "green" | "yellow" | "purple";
  children: React.ReactNode;
}) {
  const colores = {
    red: "bg-red-400",
    blue: "bg-blue-400",
    green: "bg-emerald-400",
    yellow: "bg-amber-400",
    purple: "bg-purple-400",
  };

  return (
    <section className="rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-lg font-black">
          <span className={`h-3 w-3 rounded-full ${colores[color]}`} />
          {titulo}
        </h3>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function GridDatos({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

function Dato({
  label,
  value,
  destaque = false,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 break-words font-black ${
          destaque ? "text-[#073763]" : "text-slate-900"
        }`}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}

function Calendario({ calendario }: { calendario: CalendarioConsulta }) {
  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const primerDia = new Date(calendario.anio, mesIndex(calendario.mes), 1);
  const desplazamiento = (primerDia.getDay() + 6) % 7;
  const espacios = Array.from({ length: desplazamiento }, (_, index) => index);

  return (
    <div>
      <h4 className="font-black uppercase text-[#073763]">
        📅 {calendario.mes} {calendario.anio}
      </h4>

      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500">
        {diasSemana.map((dia) => (
          <div key={dia}>{dia}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {espacios.map((item) => (
          <div key={`espacio-${item}`} />
        ))}

        {calendario.dias.map((dia) => (
          <div
            key={dia.dia}
            className={`min-h-16 rounded-xl border p-2 text-center text-xs font-black ${
              dia.trabaja
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <p>{dia.dia}</p>
            <p className="mt-1">{dia.trabaja ? "X" : "Libre"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function mesIndex(mes: string) {
  const meses = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  const index = meses.indexOf(mes.toUpperCase());

  return index >= 0 ? index : new Date().getMonth();
}

function ModalDisposiciones({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="bg-[#073763] px-6 py-4 text-white">
          <h3 className="text-2xl font-black">Disposiciones Generales</h3>
          <p className="mt-1 text-sm text-blue-100">
            Disposiciones Generales de Servicio 2026 · {VERSION_DOCUMENTO}
          </p>
        </div>

        <div className="max-h-[68vh] space-y-3 overflow-y-auto px-6 py-5 text-sm leading-6 text-slate-700">
          <p>
            <strong>1. Puntualidad y permanencia:</strong> Presentarse en el
            lugar, fecha y hora asignados para el servicio.
          </p>
          <p>
            <strong>2. Uniforme e imagen institucional:</strong> Portar uniforme
            completo, limpio y en buen estado.
          </p>
          <p>
            <strong>3. Conducta profesional:</strong> Mantener trato respetuoso,
            disciplina, ética y profesionalismo.
          </p>
          <p>
            <strong>4. Uso de recursos institucionales:</strong> Utilizar
            equipos y bienes solo para fines oficiales.
          </p>
          <p>
            <strong>5. Actuación operativa:</strong> Proceder conforme a
            protocolos institucionales.
          </p>
          <p>
            <strong>6. Reporte de novedades:</strong> Comunicar y registrar
            novedades de forma inmediata.
          </p>
          <p>
            <strong>7. Seguridad y autoprotección:</strong> Priorizar la
            integridad física propia, del equipo y ciudadanía.
          </p>
          <p>
            <strong>8. Atención ciudadana:</strong> Brindar orientación con
            respeto e imparcialidad.
          </p>
          <p>
            <strong>9. Uso de dispositivos móviles y redes:</strong> No difundir
            información del servicio sin autorización.
          </p>
          <p>
            <strong>10. Protección de datos:</strong> Toda información conocida
            por razón del servicio será reservada.
          </p>
          <p>
            <strong>11. Prohibiciones:</strong> No consumir alcohol o sustancias
            sujetas a fiscalización ni recibir beneficios indebidos.
          </p>
          <p>
            <strong>12. Aptitud para el servicio:</strong> Presentarse en
            condiciones físicas y mentales adecuadas.
          </p>
          <p>
            <strong>13. Responsabilidad:</strong> El incumplimiento podrá
            generar acciones administrativas, civiles o penales.
          </p>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#073763] px-4 py-3 font-black text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}