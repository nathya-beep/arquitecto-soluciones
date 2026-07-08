import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/types";
import { callGroq, GROQ_MODEL, GROQ_MODEL_FAST } from "@/lib/groq";

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  // Fase actual de la sesión (opcional). Se usa solo para dimensionar
  // max_tokens y no gastar el presupuesto de Groq (12k tokens/min) en turnos
  // de entrevista que son cortos.
  phase: z.enum(["exploration", "structuring", "generation", "done"]).optional(),
});

/**
 * Groq cuenta `max_tokens` como RESERVA contra el límite de tokens/minuto en
 * cada request. Reservar 4096 en cada turno de una entrevista (respuestas de
 * 2-3 frases) agota el presupuesto en 2-3 mensajes y devuelve 429.
 * Solo la generación del Prompt Master necesita una salida grande.
 */
function maxTokensForPhase(phase?: string): number {
  switch (phase) {
    case "exploration":
      return 2048; // preguntas cortas y el resumen [[RESUMEN]]
    case "structuring":
    case "generation":
      return 4096; // el siguiente turno puede ser el Prompt Master
    default:
      return 4096;
  }
}

/**
 * Los turnos de entrevista (exploración) usan el modelo rápido para no gastar
 * el presupuesto diario del modelo potente, que se reserva para el Prompt Master.
 * A partir de "structuring" el siguiente turno puede ser el entregable final,
 * así que se usa el modelo potente.
 */
function modelForPhase(phase?: string): string {
  return phase === "exploration" ? GROQ_MODEL_FAST : GROQ_MODEL;
}

export async function POST(request: NextRequest) {
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

  const result = await callGroq({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...parsed.data.messages,
    ],
    maxTokens: maxTokensForPhase(parsed.data.phase),
    temperature: 0.7,
    model: modelForPhase(parsed.data.phase),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const content = result.content || "Lo siento, no pude generar una respuesta.";
  return NextResponse.json({ content });
}
