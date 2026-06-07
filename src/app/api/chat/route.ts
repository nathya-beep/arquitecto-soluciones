import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/types";

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "PEGA_TU_CLAVE_AQUI") {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY en .env.local" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { messages } = parsed.data;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return NextResponse.json(
        { error: "Error al contactar la IA. Intenta de nuevo." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? "Lo siento, no pude generar una respuesta.";

    return NextResponse.json({ content });
  } catch (err) {
    console.error("Fetch error:", err);
    return NextResponse.json(
      { error: "Error de conexión con la IA." },
      { status: 502 }
    );
  }
}
