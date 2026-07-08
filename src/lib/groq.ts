// Cliente centralizado para la API de Groq (compatible con el formato de OpenAI).
// Toda llamada a la IA de la app pasa por aquí para tener un solo lugar donde
// cambiar el modelo, la key o el endpoint.

// Modelo potente para el entregable final (Prompt Master). Límite gratis: 100k tokens/día.
export const GROQ_MODEL = "llama-3.3-70b-versatile";
// Modelo rápido para los turnos de entrevista. Tiene su PROPIO presupuesto diario
// (500k tokens/día), así que usarlo aquí evita agotar el del 70b con la charla.
export const GROQ_MODEL_FAST = "llama-3.1-8b-instant";

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
  /** Modelo a usar. Por defecto el potente (GROQ_MODEL). */
  model?: string;
}

/** Parsea headers de Groq tipo "1m26.4s", "235ms" o "6.5s" a milisegundos. */
function parseResetMs(value: string | null): number | null {
  if (!value) return null;
  let ms = 0;
  const m = value.match(/(\d+(?:\.\d+)?)m(?!s)/); // minutos (no "ms")
  const s = value.match(/(\d+(?:\.\d+)?)s(?![a-z])/i); // segundos
  const msMatch = value.match(/(\d+(?:\.\d+)?)ms/);
  if (m) ms += parseFloat(m[1]) * 60_000;
  if (s) ms += parseFloat(s[1]) * 1000;
  if (msMatch) ms += parseFloat(msMatch[1]);
  return ms > 0 ? ms : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mensaje de límite para el usuario, con la espera aproximada si se conoce. */
function rateLimitMessage(waitMs: number | null): string {
  if (waitMs === null) return "Límite alcanzado. Intenta de nuevo en unos minutos.";
  const mins = Math.ceil(waitMs / 60_000);
  if (mins >= 1) {
    return `Alcanzamos el límite de uso de la IA por hoy. Vuelve a intentar en ~${mins} min.`;
  }
  const secs = Math.ceil(waitMs / 1000);
  return `Límite momentáneo alcanzado. Intenta de nuevo en ~${secs} s.`;
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
  model = GROQ_MODEL,
}: CallGroqOptions): Promise<GroqResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return { ok: false, error: "Falta configurar GROQ_API_KEY", status: 503 };
  }

  // Espera máxima que aceptamos reintentar dentro del request. Vercel corta las
  // funciones serverless a los ~10s, así que si el reset es mayor devolvemos el
  // error para que el cliente reintente.
  const MAX_RETRY_WAIT_MS = 4000;

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content: string = data?.choices?.[0]?.message?.content ?? "";
        return { ok: true, content };
      }

      const errText = await response.text().catch(() => "");
      console.error("Groq error:", response.status, errText);

      if (response.status === 401) {
        return { ok: false, error: "API key inválida.", status: 502 };
      }

      if (response.status === 429) {
        // El header solo refleja el límite por minuto. El bloqueo real (p. ej.
        // el límite DIARIO) viene en el cuerpo: "Please try again in 16m25s".
        const bodyWaitMs = parseResetMs(errText.match(/try again in ([\dhms.]+)/i)?.[1] ?? null);
        const headerWaitMs =
          parseResetMs(response.headers.get("x-ratelimit-reset-tokens")) ??
          parseResetMs(response.headers.get("retry-after"));
        const waitMs = bodyWaitMs ?? headerWaitMs;

        // Espera corta → reintentamos una vez de forma transparente.
        if (attempt === 0 && waitMs !== null && waitMs <= MAX_RETRY_WAIT_MS) {
          await sleep(waitMs + 250);
          continue;
        }
        // Espera larga → mensaje honesto con la duración aproximada.
        return { ok: false, error: rateLimitMessage(waitMs), status: 429 };
      }

      return { ok: false, error: "Error al contactar la IA.", status: 502 };
    }

    // Se agotaron los intentos (el reintento tras 429 también falló).
    return { ok: false, error: rateLimitMessage(null), status: 429 };
  } catch (err) {
    console.error("Groq fetch error:", err);
    return { ok: false, error: "Error de conexión con la IA.", status: 502 };
  }
}
