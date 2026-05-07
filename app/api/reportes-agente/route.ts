import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function limpiarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

function limpiarCedula(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const cedula = limpiarCedula(body.cedula);
    const nombres = limpiarTexto(body.nombres);
    const grupo = limpiarTexto(body.grupo);
    const area = limpiarTexto(body.area);
    const tipoSolicitud = limpiarTexto(body.tipoSolicitud).toUpperCase();
    const detalle = limpiarTexto(body.detalle);
    const prioridad = limpiarTexto(body.prioridad).toUpperCase() || "MEDIA";

    if (!cedula) {
      return NextResponse.json(
        { ok: false, error: "No se recibió la cédula del agente." },
        { status: 400 }
      );
    }

    if (!tipoSolicitud) {
      return NextResponse.json(
        { ok: false, error: "Selecciona el tipo de solicitud." },
        { status: 400 }
      );
    }

    if (!detalle || detalle.length < 10) {
      return NextResponse.json(
        {
          ok: false,
          error: "Describe la novedad con al menos 10 caracteres.",
        },
        { status: 400 }
      );
    }

    const prioridadesPermitidas = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

    if (!prioridadesPermitidas.includes(prioridad)) {
      return NextResponse.json(
        { ok: false, error: "Prioridad no válida." },
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

    const { data, error } = await supabaseAdmin
      .from("reportes_agente")
      .insert({
        cedula,
        nombres,
        grupo,
        area,
        tipo_solicitud: tipoSolicitud,
        detalle,
        prioridad,
        estado: "PENDIENTE",
        origen: "PORTAL_AGENTE",
        user_agent: request.headers.get("user-agent"),
        ip_origen:
          request.headers.get("x-forwarded-for") ??
          request.headers.get("x-real-ip") ??
          null,
      })
      .select("id, cedula, tipo_solicitud, prioridad, estado, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Error registrando reporte: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reporte: data,
      mensaje:
        "Reporte enviado correctamente. Será revisado por el personal administrativo.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado enviando reporte.",
      },
      { status: 500 }
    );
  }
}