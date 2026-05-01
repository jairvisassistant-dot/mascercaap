import { NextRequest, NextResponse } from "next/server";
import { leadSchema } from "@/lib/schemas/lead";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
    }

    const { data } = parsed;

    const { error } = await supabase.from("leads").insert({
      nombre: data.nombre,
      email: data.email ?? null,
      tipo: data.tipo,
      producto_interes: data.producto_interes ?? null,
      preguntas_bot: data.preguntas_bot ?? [],
      fuente: "chatbot_web",
    });

    if (error) {
      console.error("Supabase insert error:", error.message);
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
