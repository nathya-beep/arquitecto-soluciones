// Cliente centralizado para la API de Groq (compatible con el formato de OpenAI).
// Toda llamada a la IA de la app pasa por aquí para tener un solo lugar donde
// cambiar el modelo, la key o el endpoint.

// Modelo potente para el entregable final (Prompt Master). Límite gratis: 100k tokens/día.
export const GROQ_MODEL = "llama-3.3-70b-versatile";
// Modelo rápido para los turnos de entrevista. Tiene su PROPIO presupuesto diario
// (500k tokens/día), así que usarlo aquí evita agotar el del 70b con la charla.
export const GROQ_MODEL_FAST = "llama-3.1-8b-instant";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Modo de calidad de la IA (variable de entorno AI_QUALITY_MODE):
 * - "balanced" (por defecto): entrevista con 8b (rápido, presupuesto diario
 *   grande) y solo el Prompt Master con 70b. Pensado para el plan GRATIS de Groq.
 * - "max": usa el 70b en TODA la entrevista y el Prompt Master. Máxima calidad,
 *   pero agota el límite diario del 70b en el plan gratis → requiere Groq Dev
 *   Tier (de pago). Para activarlo: AI_QUALITY_MODE=max.
 *
 * Default = "balanced" porque el Dev Tier de Groq está temporalmente
 * deshabilitado (2026-07); cambiar a "max" cuando se pueda activar el pago.
 */
export type QualityMode = "max" | "balanced";
export function getQualityMode(): QualityMode {
  return (process.env.AI_QUALITY_MODE ?? "").trim().toLowerCase() === "max"
    ? "max"
    : "balanced";
}

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
  /** Razón de finalización de Groq ("stop", "length", ...). */
  finishReason?: string;
  /** true si la respuesta quedó cortada por el límite de tokens (aun tras continuar). */
  truncated?: boolean;
}

/** Lee la API key limpiando BOM y espacios que a veces se cuelan al pegarla. */
export function getGroqApiKey(): string {
  return (process.env.GROQ_API_KEY ?? "").replace(/﻿/g, "").trim();
}

/** Formato de respuesta de Groq (compatible con OpenAI). Usar json_object fuerza
 * al modelo a devolver JSON válido — imprescindible para respuestas que luego
 * parseamos (p. ej. la propuesta comercial). Requiere que el prompt mencione "JSON". */
export type GroqResponseFormat = { type: "json_object" } | { type: "text" };

interface CallGroqOptions {
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Modelo a usar. Por defecto el potente (GROQ_MODEL). */
  model?: string;
  /** Idioma de los mensajes de error hacia el usuario. */
  lang?: Lang;
  /** Si se pasa, se envía a Groq como response_format (p. ej. { type: "json_object" }). */
  responseFormat?: GroqResponseFormat;
  /**
   * Si la respuesta se corta por límite de tokens (finish_reason "length"),
   * pide continuaciones y las concatena. Úsalo para entregables largos como el
   * Prompt Master, para que nunca lleguen cortados.
   */
  completeIfTruncated?: boolean;
}

/** Máximo de continuaciones cuando la respuesta se trunca. */
const MAX_CONTINUATIONS = 4;

/** Parsea headers de Groq tipo "1m26.4s", "235ms" o "6.5s" a milisegundos. */
export function parseResetMs(value: string | null): number | null {
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

type Lang = "es" | "en";

const ERR = {
  es: {
    noKey: "Falta configurar GROQ_API_KEY",
    invalidKey: "API key inválida.",
    aiError: "Error al contactar la IA.",
    connError: "Error de conexión con la IA.",
    limitGeneric: "Límite alcanzado. Intenta de nuevo en unos minutos.",
    limitDaily: (m: number) => `Alcanzamos el límite de uso de la IA por hoy. Vuelve a intentar en ~${m} min.`,
    limitShort: (s: number) => `Límite momentáneo alcanzado. Intenta de nuevo en ~${s} s.`,
  },
  en: {
    noKey: "GROQ_API_KEY is not configured",
    invalidKey: "Invalid API key.",
    aiError: "Error contacting the AI.",
    connError: "Connection error with the AI.",
    limitGeneric: "Usage limit reached. Please try again in a few minutes.",
    limitDaily: (m: number) => `We hit today's AI usage limit. Please try again in ~${m} min.`,
    limitShort: (s: number) => `Momentary limit reached. Please try again in ~${s} s.`,
  },
} satisfies Record<Lang, Record<string, unknown>>;

/** Mensaje de límite para el usuario, con la espera aproximada si se conoce. */
function rateLimitMessage(waitMs: number | null, lang: Lang): string {
  const e = ERR[lang];
  if (waitMs === null) return e.limitGeneric;
  const mins = Math.ceil(waitMs / 60_000);
  if (mins >= 1) return e.limitDaily(mins);
  return e.limitShort(Math.ceil(waitMs / 1000));
}

/**
 * Llama a Groq y normaliza la respuesta/errores.
 * Nunca lanza: siempre devuelve un GroqResult que la route handler puede
 * traducir a NextResponse.
 */
// Espera máxima que aceptamos reintentar DENTRO del request. Vercel corta las
// funciones serverless a los ~10s, así que si el reset es mayor devolvemos el
// error para que el cliente reintente.
const MAX_RETRY_WAIT_MS = 4000;

/** Una sola petición a Groq, con reintento transparente ante un 429 corto. */
async function singleRequest(
  apiKey: string,
  model: string,
  messages: GroqMessage[],
  maxTokens: number,
  temperature: number,
  lang: Lang,
  responseFormat?: GroqResponseFormat
): Promise<GroqResult> {
  const e = ERR[lang];
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
          ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const choice = data?.choices?.[0];
        return {
          ok: true,
          content: choice?.message?.content ?? "",
          finishReason: choice?.finish_reason,
        };
      }

      const errText = await response.text().catch(() => "");
      console.error("Groq error:", response.status, errText);

      if (response.status === 401) return { ok: false, error: e.invalidKey, status: 502 };

      if (response.status === 429) {
        // El header solo refleja el límite por minuto. El bloqueo real (p. ej.
        // el límite DIARIO) viene en el cuerpo: "Please try again in 16m25s".
        const bodyWaitMs = parseResetMs(errText.match(/try again in ([\dhms.]+)/i)?.[1] ?? null);
        const headerWaitMs =
          parseResetMs(response.headers.get("x-ratelimit-reset-tokens")) ??
          parseResetMs(response.headers.get("retry-after"));
        const waitMs = bodyWaitMs ?? headerWaitMs;

        if (attempt === 0 && waitMs !== null && waitMs <= MAX_RETRY_WAIT_MS) {
          await sleep(waitMs + 250);
          continue;
        }
        return { ok: false, error: rateLimitMessage(waitMs, lang), status: 429 };
      }

      return { ok: false, error: e.aiError, status: 502 };
    }
    return { ok: false, error: rateLimitMessage(null, lang), status: 429 };
  } catch (err) {
    console.error("Groq fetch error:", err);
    return { ok: false, error: e.connError, status: 502 };
  }
}

/**
 * Llama a Groq y normaliza la respuesta/errores.
 * Nunca lanza: siempre devuelve un GroqResult que la route handler puede
 * traducir a NextResponse. Si completeIfTruncated está activo y la respuesta se
 * corta por tokens, pide continuaciones y las concatena.
 */
export async function callGroq({
  messages,
  maxTokens = 4096,
  temperature = 0.7,
  model = GROQ_MODEL,
  lang = "es",
  completeIfTruncated = false,
  responseFormat,
}: CallGroqOptions): Promise<GroqResult> {
  const e = ERR[lang];
  const apiKey = getGroqApiKey();
  if (!apiKey) return { ok: false, error: e.noKey, status: 503 };

  const first = await singleRequest(apiKey, model, messages, maxTokens, temperature, lang, responseFormat);
  if (!first.ok) return first;

  let content = first.content ?? "";
  let finishReason = first.finishReason;

  // Continuar mientras se corte por longitud (evita entregables truncados).
  if (completeIfTruncated) {
    const convo = [...messages];
    let lastChunk = content;
    let n = 0;
    while (finishReason === "length" && n < MAX_CONTINUATIONS) {
      convo.push({ role: "assistant", content: lastChunk });
      convo.push({
        role: "user",
        content:
          "Continue the previous message EXACTLY from where you stopped. Do not repeat anything already written, do not add a preamble, just keep going.",
      });
      const next = await singleRequest(apiKey, model, convo, maxTokens, temperature, lang);
      if (!next.ok) break; // devolvemos lo acumulado hasta aquí
      lastChunk = next.content ?? "";
      content += lastChunk;
      finishReason = next.finishReason;
      n++;
    }
  }

  return { ok: true, content, finishReason, truncated: finishReason === "length" };
}
