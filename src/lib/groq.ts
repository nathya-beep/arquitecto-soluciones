// Cliente centralizado para la API de Groq (compatible con el formato de OpenAI).
// Toda llamada a la IA de la app pasa por aquí para tener un solo lugar donde
// cambiar el modelo, la key o el endpoint.

export const GROQ_MODEL = "llama-3.3-70b-versatile";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqResult {
  ok: boolean;
  /** Texto de la respuesta cuando ok === true */
  content?: string;
  /** Mensaje de error para el cliente cuando ok === false */
  error?: string;
  /** Código HTTP sugerido para responder al cliente */
  status?: number;
}

/** Lee la API key limpiando BOM y espacios que a veces se cuelan al pegarla. */
export function getGroqApiKey(): string {
  return (process.env.GROQ_API_KEY ?? "").replace(/﻿/g, "").trim();
}

interface CallGroqOptions {
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Llama a Groq y normaliza la respuesta/errores.
 * Nunca lanza: siempre devuelve un GroqResult que la route handler puede
 * traducir a NextResponse.
 */
export async function callGroq({
  messages,
  maxTokens = 4096,
  temperature = 0.7,
}: CallGroqOptions): Promise<GroqResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return { ok: false, error: "Falta configurar GROQ_API_KEY", status: 503 };
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("Groq error:", response.status, errText);
      if (response.status === 401) {
        return { ok: false, error: "API key inválida.", status: 502 };
      }
      if (response.status === 429) {
        return { ok: false, error: "Límite alcanzado. Intenta en un momento.", status: 429 };
      }
      return { ok: false, error: "Error al contactar la IA.", status: 502 };
    }

    const data = await response.json();
    const content: string =
      data?.choices?.[0]?.message?.content ?? "";
    return { ok: true, content };
  } catch (err) {
    console.error("Groq fetch error:", err);
    return { ok: false, error: "Error de conexión con la IA.", status: 502 };
  }
}
