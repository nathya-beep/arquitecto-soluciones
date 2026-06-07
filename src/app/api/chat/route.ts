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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar GEMINI_API_KEY en Vercel" },
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

  // Convertir formato Anthropic → Gemini
  // Anthropic: role "assistant" → Gemini: role "model"
  const geminiContents = parsed.data.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const geminiBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      if (response.status === 400) {
        return NextResponse.json({ error: "Error en la solicitud a la IA." }, { status: 502 });
      }
      if (response.status === 429) {
        return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
      }
      return NextResponse.json({ error: "Error al contactar la IA. Intenta de nuevo." }, { status: 502 });
    }

    const data = await response.json();
    const content =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Lo siento, no pude generar una respuesta.";

    return NextResponse.json({ content });
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return NextResponse.json(
      { error: "Error de conexión con la IA." },
      { status: 502 }
    );
  }
}
