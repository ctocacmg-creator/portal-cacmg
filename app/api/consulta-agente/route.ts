import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VERSION_DOCUMENTO = "DISPOSICIONES_CONSULTA_V1_2026";

function limpiarCedula(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

function limpiarTexto(valor: unknown) {
  return String(valor ?? "").trim();
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
            "Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
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
      .select("id, cedula, nombres, grupo, area, codigo_validacion")
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
      .select(
        "cedula, grupo, area, id_puesto, funcion, horario, observacion, fecha_inicio, estado_asignacion, created_at"
      )
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

    if (!asignacion) {
      return NextResponse.json({
        ok: true,
        agente: {
          cedula: persona.cedula,
          nombres: persona.nombres,
          grupo: persona.grupo,
          area: persona.area,
        },
        asignacion: null,
        mensaje: "No tienes una asignación activa registrada.",
      });
    }

    return NextResponse.json({
      ok: true,
      agente: {
        cedula: persona.cedula,
        nombres: persona.nombres,
        grupo: persona.grupo,
        area: persona.area,
      },
      asignacion,
      mensaje: "Consulta realizada correctamente.",
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