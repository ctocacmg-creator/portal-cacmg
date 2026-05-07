import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VERSION_DOCUMENTO = "DISPOSICIONES_CONSULTA_V1_2026";

const MESES = [
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

type CicloRow = Record<string, unknown> & {
  mes?: string | null;
  grupo?: string | null;
  dias_trabajo?: number | null;
  dias_descanso?: number | null;
};

function limpiarCedula(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

function limpiarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizar(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizarClave(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function obtenerValor(row: Record<string, unknown>, posibles: string[]) {
  const entries = Object.entries(row);

  for (const posible of posibles) {
    const posibleNormalizado = normalizarClave(posible);

    const encontrado = entries.find(
      ([key, value]) =>
        normalizarClave(key) === posibleNormalizado &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );

    if (encontrado) {
      return encontrado[1];
    }
  }

  return null;
}

function diasDelMes(anio: number, mesIndex: number) {
  return new Date(anio, mesIndex + 1, 0).getDate();
}

function esDiaTrabajo(valor: unknown) {
  const texto = normalizar(valor);

  return (
    texto === "X" ||
    texto === "SI" ||
    texto === "SÍ" ||
    texto === "T" ||
    texto === "TRABAJO" ||
    texto === "TRABAJA" ||
    texto === "LABORA" ||
    texto === "1" ||
    texto === "TRUE"
  );
}

function construirCalendario(
  ciclo: CicloRow | null,
  anio: number,
  mesIndex: number
) {
  const totalDias = diasDelMes(anio, mesIndex);

  const dias = Array.from({ length: totalDias }, (_, index) => {
    const dia = index + 1;

    const diaDosDigitos = String(dia).padStart(2, "0");

const valor = ciclo
  ? obtenerValor(ciclo, [
      `dia_${dia}`,
      `dia_${diaDosDigitos}`,
      `dia${dia}`,
      `dia${diaDosDigitos}`,
      `dia ${dia}`,
      `dia ${diaDosDigitos}`,
      `d${dia}`,
      `d${diaDosDigitos}`,
      `DIA_${dia}`,
      `DIA_${diaDosDigitos}`,
      `DIA${dia}`,
      `DIA${diaDosDigitos}`,
      `DIA ${dia}`,
      `DIA ${diaDosDigitos}`,
      `D ${dia}`,
      `D ${diaDosDigitos}`,
    ])
  : null;

    const fecha = new Date(anio, mesIndex, dia);
    const nombreDia = new Intl.DateTimeFormat("es-EC", {
      weekday: "short",
    }).format(fecha);

    const trabaja = esDiaTrabajo(valor);

    return {
      dia,
      nombreDia,
      valor: valor ? String(valor) : "",
      trabaja,
      estado: trabaja ? "TRABAJA" : "LIBRE",
    };
  });

  const diasTrabajoCalculados = dias.filter((item) => item.trabaja).length;
  const diasLibresCalculados = dias.length - diasTrabajoCalculados;

  return {
    mes: MESES[mesIndex],
    anio,
    dias,
    dias_trabajo:
      Number(ciclo?.dias_trabajo ?? 0) > 0
        ? Number(ciclo?.dias_trabajo)
        : diasTrabajoCalculados,
    dias_descanso:
      Number(ciclo?.dias_descanso ?? 0) > 0
        ? Number(ciclo?.dias_descanso)
        : diasLibresCalculados,
    ciclo_encontrado: Boolean(ciclo),
  };
}

function obtenerEstadoDia(
  calendario: ReturnType<typeof construirCalendario>,
  dia: number
) {
  const registro = calendario.dias.find((item) => item.dia === dia);

  if (!registro) return "N/A";

  return registro.trabaja ? "TRABAJA" : "LIBRE";
}

function calcularAvanceMes(
  calendario: ReturnType<typeof construirCalendario>,
  diaActual: number
) {
  const totalTrabajo = calendario.dias.filter((dia) => dia.trabaja).length;

  if (totalTrabajo === 0) return 0;

  const trabajoEjecutado = calendario.dias
    .filter((dia) => dia.dia <= diaActual)
    .filter((dia) => dia.trabaja).length;

  return Math.round((trabajoEjecutado / totalTrabajo) * 100);
}

function buscarCiclo(ciclos: CicloRow[], grupo: string, mes: string) {
  return (
    ciclos.find(
      (ciclo) =>
        normalizar(ciclo.grupo) === normalizar(grupo) &&
        normalizar(ciclo.mes) === normalizar(mes)
    ) ?? null
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const cedula = limpiarCedula(body.cedula);
    const codigoValidacion = limpiarTexto(body.codigoValidacion);
    const aceptaDisposiciones = Boolean(body.aceptaDisposiciones);
    const captchaA = Number(body.captchaA);
    const captchaB = Number(body.captchaB);
    const captchaRespuesta = Number(body.captchaRespuesta);

    if (!cedula) {
      return NextResponse.json(
        { ok: false, error: "Ingresa la cédula." },
        { status: 400 }
      );
    }

    if (!codigoValidacion) {
      return NextResponse.json(
        { ok: false, error: "Ingresa el código de validación." },
        { status: 400 }
      );
    }

    if (!aceptaDisposiciones) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debes aceptar las disposiciones generales del servicio antes de consultar.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(captchaA) ||
      !Number.isFinite(captchaB) ||
      !Number.isFinite(captchaRespuesta) ||
      captchaA + captchaB !== captchaRespuesta
    ) {
      return NextResponse.json(
        { ok: false, error: "La respuesta lógica anti-bot es incorrecta." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: persona, error: errorPersona } = await supabaseAdmin
      .from("personas")
      .select("*")
      .eq("cedula", cedula)
      .maybeSingle();

    if (errorPersona) {
      return NextResponse.json(
        {
          ok: false,
          error: `Error validando agente: ${errorPersona.message}`,
        },
        { status: 500 }
      );
    }

    if (!persona) {
      return NextResponse.json(
        { ok: false, error: "No se encontró un agente con esa cédula." },
        { status: 404 }
      );
    }

    const codigoRegistrado = String(persona.codigo_validacion ?? "").trim();

    if (!codigoRegistrado) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El agente no tiene código de validación registrado en NOMINA.",
        },
        { status: 403 }
      );
    }

    if (codigoRegistrado !== codigoValidacion) {
      return NextResponse.json(
        { ok: false, error: "Código de validación incorrecto." },
        { status: 403 }
      );
    }

    await supabaseAdmin.from("aceptaciones_consulta").insert({
      cedula,
      version_documento: VERSION_DOCUMENTO,
      aceptado: true,
      ip_origen:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        null,
      user_agent: request.headers.get("user-agent"),
    });

    const { data: asignacion, error: errorAsignacion } = await supabaseAdmin
      .from("asignaciones")
      .select("*")
      .eq("cedula", cedula)
      .eq("estado_asignacion", "ACTIVO")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorAsignacion) {
      return NextResponse.json(
        {
          ok: false,
          error: `Error consultando asignación: ${errorAsignacion.message}`,
        },
        { status: 500 }
      );
    }

    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActualIndex = hoy.getMonth();
    const mesSiguienteIndex = (mesActualIndex + 1) % 12;
    const anioSiguiente =
      mesSiguienteIndex === 0 ? anioActual + 1 : anioActual;

    const grupoPersona = String(persona.grupo ?? "").trim();

    const { data: ciclosData, error: errorCiclos } = await supabaseAdmin
      .from("ciclos_trabajo")
      .select("*");

    if (errorCiclos) {
      return NextResponse.json(
        {
          ok: false,
          error: `Error consultando ciclos: ${errorCiclos.message}`,
        },
        { status: 500 }
      );
    }

    const ciclos = (ciclosData ?? []) as CicloRow[];

    const cicloActual = buscarCiclo(
      ciclos,
      grupoPersona,
      MESES[mesActualIndex]
    );

    const cicloSiguiente = buscarCiclo(
      ciclos,
      grupoPersona,
      MESES[mesSiguienteIndex]
    );

    const calendarioActual = construirCalendario(
      cicloActual,
      anioActual,
      mesActualIndex
    );

    const calendarioSiguiente = construirCalendario(
      cicloSiguiente,
      anioSiguiente,
      mesSiguienteIndex
    );

    const diaHoy = hoy.getDate();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    const calendarioParaManana =
      manana.getMonth() === mesActualIndex
        ? calendarioActual
        : calendarioSiguiente;

    const estadoOperativo = {
      hoy: obtenerEstadoDia(calendarioActual, diaHoy),
      manana: obtenerEstadoDia(calendarioParaManana, manana.getDate()),
      dias_trabajo_mes: calendarioActual.dias_trabajo,
      dias_libres_mes: calendarioActual.dias_descanso,
      avance_mes: calcularAvanceMes(calendarioActual, diaHoy),
      ciclo_actual_encontrado: calendarioActual.ciclo_encontrado,
      ciclo_siguiente_encontrado: calendarioSiguiente.ciclo_encontrado,
    };

    return NextResponse.json({
      ok: true,
      agente: {
        cedula: persona.cedula,
        nombres: persona.nombres,
        grupo: persona.grupo,
        area: persona.area,
        detalle: persona,
      },
      asignacion,
      calendarios: {
        actual: calendarioActual,
        siguiente: calendarioSiguiente,
      },
      estado_operativo: estadoOperativo,
      mensaje: asignacion
        ? "Consulta realizada correctamente."
        : "No tienes una asignación activa registrada.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado consultando asignación.",
      },
      { status: 500 }
    );
  }
}