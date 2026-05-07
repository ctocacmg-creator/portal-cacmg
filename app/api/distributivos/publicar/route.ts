import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function limpiarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fecha = limpiarTexto(body.fecha);
    const observacion = limpiarTexto(body.observacion);

    if (!fecha) {
      return NextResponse.json(
        { ok: false, error: "La fecha es obligatoria." },
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
      .from("distributivos_publicados")
      .upsert(
        {
          fecha,
          estado: "PUBLICADO",
          observacion: observacion || "Distributivo publicado desde el portal.",
          publicado_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "fecha",
        }
      )
      .select("id, fecha, estado, observacion, publicado_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Error publicando distributivo: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      distributivo: data,
      mensaje: `Distributivo ${fecha} publicado correctamente.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado publicando distributivo.",
      },
      { status: 500 }
    );
  }
}