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
  id?: string;
  nombre_ciclo?: string | null;
  tipo_ciclo?: string | null;
  mes?: string | null;
  grupo?: string | null;
  dias_trabajo?: number | string | null;
  dias_descanso?: number | string | null;
  dias_plan?: unknown;
  anio?: number | string | null;
  mes_numero?: number | string | null;
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

function extraerValorCelda(valor: unknown) {
  if (valor === null || valor === undefined) return null;

  if (typeof valor === "object" && !Array.isArray(valor)) {
    const obj = valor as Record<string, unknown>;

    return (
      obj.valor ??
      obj.estado ??
      obj.tipo ??
      obj.trabaja ??
      obj.dia ??
      obj.value ??
      null
    );
  }

  return valor;
}

function obtenerDesdeDiasPlan(diasPlan: unknown, dia: number) {
  if (!diasPlan) return null;

  let plan = diasPlan;

  if (typeof diasPlan === "string") {
    try {
      plan = JSON.parse(diasPlan);
    } catch {
      return diasPlan;
    }
  }

  if (Array.isArray(plan)) {
    const valorDirecto = plan[dia - 1];

    if (valorDirecto !== undefined && valorDirecto !== null) {
      return extraerValorCelda(valorDirecto);
    }

    const encontrado = plan.find((item) => {
      if (!item || typeof item !== "object") return false;

      const obj = item as Record<string, unknown>;

      return Number(obj.dia ?? obj.numero ?? obj.day) === dia;
    });

    return extraerValorCelda(encontrado);
  }

  if (typeof plan === "object") {
    const obj = plan as Record<string, unknown>;

    const diaDosDigitos = String(dia).padStart(2, "0");

    const candidatos = [
      String(dia),
      diaDosDigitos,
      `dia_${dia}`,
      `dia_${diaDosDigitos}`,
      `dia${dia}`,
      `dia${diaDosDigitos}`,
      `dia ${dia}`,
      `dia ${diaDosDigitos}`,
      `DIA_${dia}`,
      `DIA_${diaDosDigitos}`,
      `DIA${dia}`,
      `DIA${diaDosDigitos}`,
      `DIA ${dia}`,
      `DIA ${diaDosDigitos}`,
      `d${dia}`,
      `d${diaDosDigitos}`,
      `D${dia}`,
      `D${diaDosDigitos}`,
    ];

    for (const candidato of candidatos) {
      const valor = obj[candidato];

      if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
        return extraerValorCelda(valor);
      }
    }

    const encontrado = Object.entries(obj).find(([key, value]) => {
      const clave = normalizarClave(key);

      const matchDia = clave.match(/^DIA0?(\d{1,2})$/);
      const matchD = clave.match(/^D0?(\d{1,2})$/);
      const matchNumero = clave.match(/^0?(\d{1,2})$/);

      const numeroDia = matchDia?.[1] ?? matchD?.[1] ?? matchNumero?.[1];

      return (
        numeroDia &&
        Number(numeroDia) === dia &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      );
    });

    if (encontrado) {
      return extraerValorCelda(encontrado[1]);
    }
  }

  return null;
}
function numero(valor: unknown) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
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

function obtenerCampoNormalizado(row: Record<string, unknown>, nombres: string[]) {
  const entries = Object.entries(row);

  for (const nombre of nombres) {
    const buscado = normalizarClave(nombre);

    const encontrado = entries.find(([key, value]) => {
      return (
        normalizarClave(key) === buscado &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      );
    });

    if (encontrado) return encontrado[1];
  }

  return null;
}

function obtenerValorDia(ciclo: CicloRow, dia: number) {
  const valorJson = obtenerDesdeDiasPlan(ciclo.dias_plan, dia);

  if (
    valorJson !== null &&
    valorJson !== undefined &&
    String(valorJson).trim() !== ""
  ) {
    return valorJson;
  }

  const diaDosDigitos = String(dia).padStart(2, "0");

  const candidatos = [
    `dia_${dia}`,
    `dia_${diaDosDigitos}`,
    `dia${dia}`,
    `dia${diaDosDigitos}`,
    `dia ${dia}`,
    `dia ${diaDosDigitos}`,
    `d_${dia}`,
    `d_${diaDosDigitos}`,
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
  ];

  const valorPorNombre = obtenerCampoNormalizado(ciclo, candidatos);

  if (valorPorNombre !== null) {
    return valorPorNombre;
  }

  return null;
}

function construirCalendario(
  ciclo: CicloRow | null,
  anio: number,
  mesIndex: number
) {
  const totalDias = diasDelMes(anio, mesIndex);

  const dias = Array.from({ length: totalDias }, (_, index) => {
    const dia = index + 1;
    const valor = ciclo ? obtenerValorDia(ciclo, dia) : null;

    const fecha = new Date(anio, mesIndex, dia);
    const nombreDia = new Intl.DateTimeFormat("es-EC", {
      weekday: "short",
    }).format(fecha);

    const trabaja = esDiaTrabajo(valor);

    return {
      dia,
      nombreDia,
      valor: valor === null || valor === undefined ? "" : String(valor),
      trabaja,
      estado: trabaja ? "TRABAJA" : "LIBRE",
    };
  });

  const diasTrabajoCalculados = dias.filter((item) => item.trabaja).length;
  const diasLibresCalculados = dias.length - diasTrabajoCalculados;

  const diasTrabajoTabla = ciclo
    ? numero(
        obtenerCampoNormalizado(ciclo, [
          "dias_trabajo",
          "dias trabajo",
          "DIAS TRABAJO",
          "DÍAS TRABAJO",
        ])
      )
    : 0;

  const diasDescansoTabla = ciclo
    ? numero(
        obtenerCampoNormalizado(ciclo, [
          "dias_descanso",
          "dias descanso",
          "DIAS DESCANSO",
          "DÍAS DESCANSO",
        ])
      )
    : 0;

  const camposDiaDetectados = ciclo
    ? Object.keys(ciclo).filter((key) => {
        const clave = normalizarClave(key);
        return /^DIA0?\d{1,2}$/.test(clave) || /^D0?\d{1,2}$/.test(clave);
      })
    : [];

  return {
    mes: MESES[mesIndex],
    anio,
    dias,
    dias_trabajo: diasTrabajoTabla > 0 ? diasTrabajoTabla : diasTrabajoCalculados,
    dias_descanso:
      diasDescansoTabla > 0 ? diasDescansoTabla : diasLibresCalculados,
    ciclo_encontrado: Boolean(ciclo),
    campos_dia_detectados: camposDiaDetectados,
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

function buscarCiclo(
  ciclos: CicloRow[],
  grupo: string,
  mes: string,
  anio: number,
  mesNumero: number
) {
  return (
    ciclos.find((ciclo) => {
      const grupoCiclo =
        obtenerCampoNormalizado(ciclo, ["grupo", "GRUPO"]) ?? ciclo.grupo;

      const mesCiclo = obtenerCampoNormalizado(ciclo, ["mes", "MES"]) ?? ciclo.mes;

      const anioCiclo = Number(ciclo.anio ?? 0);
      const mesNumeroCiclo = Number(ciclo.mes_numero ?? 0);

      const coincideGrupo = normalizar(grupoCiclo) === normalizar(grupo);

      const coincideMesTexto =
        normalizar(mesCiclo) === normalizar(mes);

      const coincideMesNumero =
        mesNumeroCiclo > 0 && mesNumeroCiclo === mesNumero;

      const coincideAnio =
        !anioCiclo || anioCiclo === anio;

      return coincideGrupo && coincideAnio && (coincideMesTexto || coincideMesNumero);
    }) ?? null
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

    const { error: errorAceptacion } = await supabaseAdmin
      .from("aceptaciones_consulta")
      .insert({
        cedula,
        version_documento: VERSION_DOCUMENTO,
        aceptado: true,
        ip_origen:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          null,
        user_agent: request.headers.get("user-agent"),
      });

    if (errorAceptacion) {
      return NextResponse.json(
        {
          ok: false,
          error: `Error registrando aceptación: ${errorAceptacion.message}`,
        },
        { status: 500 }
      );
    }

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
  MESES[mesActualIndex],
  anioActual,
  mesActualIndex + 1
);

const cicloSiguiente = buscarCiclo(
  ciclos,
  grupoPersona,
  MESES[mesSiguienteIndex],
  anioSiguiente,
  mesSiguienteIndex + 1
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
      campos_dia_actual: calendarioActual.campos_dia_detectados,
      campos_dia_siguiente: calendarioSiguiente.campos_dia_detectados,
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