import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/types";

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

function makeClient(apiKey: string): Anthropic {
  if (apiKey.startsWith("sk-ant-oat")) {
    return new Anthropic({ authToken: apiKey });
  }
  return new Anthropic({ apiKey });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "PEGA_TU_CLAVE_AQUI") {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY" },
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
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const client = makeClient(apiKey);
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: parsed.data.messages,
    });

    const content = response.content[0]?.type === "text"
      ? response.content[0].text
      : "Lo siento, no pude generar una respuesta.";

    return NextResponse.json({ content });
  } catch (err: unknown) {
    console.error("Anthropic SDK error:", err);
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return NextResponse.json({ error: "API key inválida o expirada." }, { status: 502 });
      }
      if (err.status === 429) {
        return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
      }
      return NextResponse.json({ error: `Error de la IA: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "Error de conexión con la IA." }, { status: 502 });
  }
}
