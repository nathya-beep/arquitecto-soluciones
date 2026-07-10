import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CommercialSummary } from "@/lib/types";
import { callGroq, GROQ_MODEL, GROQ_MODEL_FAST, getQualityMode } from "@/lib/groq";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const RequestSchema = z.object({
  finalPrompt: z.string().min(1),
  title: z.string(),
  lang: z.enum(["es", "en"]).optional(),
});

/** Valida que el JSON del modelo tenga la forma de una propuesta comercial usable. */
const SummarySchema = z.object({
  headline: z.string().min(1),
  problem: z.string().min(1),
  benefits: z.array(z.string().min(1)).min(1),
  howItWorks: z.array(z.string().min(1)).min(1),
  roiEstimate: z.string().min(1),
  callToAction: z.string().min(1),
});

/** Extrae y valida la propuesta del texto del modelo. Devuelve null si no es usable
 * (así el caller puede reintentar en vez de aceptar basura). Tolera ```json ... ```
 * y prosa alrededor: se queda con el primer objeto { ... } balanceado. */
function extractSummary(raw: string | undefined): CommercialSummary | null {
  if (!raw) return null;
  const stripped = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const candidate = start !== -1 && end > start ? stripped.slice(start, end + 1) : stripped;
  try {
    const parsed = SummarySchema.safeParse(JSON.parse(candidate));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const ENGLISH_DIRECTIVE =
  "\n\nIMPORTANT: Write ALL field values in ENGLISH. Keep the JSON keys exactly as specified above (in English).";

const COMMERCIAL_SYSTEM = `Eres un consultor de automatización empresarial experto en ventas B2B.
Tu tarea es leer una especificación técnica y crear una presentación COMERCIAL en español para vender la automatización a un tomador de decisiones de negocio.
La presentación debe ser persuasiva, orientada a resultados y enfocada en ROI.
Devuelve SOLO un objeto JSON válido con exactamente estos campos (sin markdown, sin explicaciones):
{
  "headline": "Titular impactante de máximo 10 palabras",
  "problem": "Descripción del problema en 2-3 oraciones. Cuantifica el impacto negativo actual si es posible.",
  "benefits": ["Beneficio 1 con métrica de impacto", "Beneficio 2 con métrica", "Beneficio 3 con métrica", "Beneficio 4 con métrica"],
  "howItWorks": ["Paso 1: descripción concisa", "Paso 2: descripción concisa", "Paso 3: descripción concisa"],
  "roiEstimate": "Estimado de retorno de inversión en tiempo ahorrado, errores reducidos o dinero generado/ahorrado por mes/año",
  "callToAction": "Frase de cierre motivadora y urgente para implementar la solución"
}`;

const FALLBACK_SUMMARY_ES: CommercialSummary = {
  headline: "Automatización que transforma tu negocio",
  problem: "Tu equipo dedica horas a tareas repetitivas que una herramienta inteligente puede resolver.",
  benefits: [
    "Ahorra horas de trabajo manual cada semana",
    "Elimina errores humanos en procesos críticos",
    "Escala operaciones sin aumentar el equipo",
    "Datos en tiempo real para decisiones más rápidas",
  ],
  howItWorks: [
    "El sistema captura y procesa tu información automáticamente",
    "Aplica las reglas de negocio definidas para tu caso específico",
    "Entrega resultados listos para usar en segundos",
  ],
  roiEstimate: "Recupera la inversión en el primer mes con el tiempo ahorrado en procesos manuales",
  callToAction: "Implementa esta automatización hoy y libera a tu equipo para lo que realmente importa",
};

const FALLBACK_SUMMARY_EN: CommercialSummary = {
  headline: "Automation that transforms your business",
  problem: "Your team spends hours on repetitive tasks that a smart tool can handle.",
  benefits: [
    "Save hours of manual work every week",
    "Eliminate human error in critical processes",
    "Scale operations without growing the team",
    "Real-time data for faster decisions",
  ],
  howItWorks: [
    "The system captures and processes your information automatically",
    "It applies the business rules defined for your specific case",
    "It delivers ready-to-use results in seconds",
  ],
  roiEstimate: "Recover your investment in the first month through the time saved on manual work",
  callToAction: "Deploy this automation today and free your team for what truly matters",
};

export async function POST(request: NextRequest) {
  const limited = rateLimit(`summary:${clientIp(request)}`, 15, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
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

  const isEn = parsed.data.lang === "en";
  const system = isEn ? COMMERCIAL_SYSTEM + ENGLISH_DIRECTIVE : COMMERCIAL_SYSTEM;
  // En modo "max" usa el 70b (mejor copy comercial); en "balanced" el 8b para
  // reservar el presupuesto diario del 70b al Prompt Master.
  const model = getQualityMode() === "max" ? GROQ_MODEL : GROQ_MODEL_FAST;

  const callParams = {
    messages: [
      { role: "system" as const, content: system },
      {
        role: "user" as const,
        content: `Aquí está la especificación técnica del proyecto "${parsed.data.title}":\n\n${parsed.data.finalPrompt}`,
      },
    ],
    maxTokens: 1024,
    temperature: 0.5,
    model,
    lang: parsed.data.lang,
    // Fuerza JSON válido: sin esto el 8b devuelve prosa alrededor del objeto y el
    // parseo fallaba, cayendo al genérico. Groq exige que el prompt mencione "JSON".
    responseFormat: { type: "json_object" as const },
  };

  // Reintento: si el primer intento no produce un JSON usable, probamos una vez
  // más antes de rendirnos. Así la propuesta casi nunca cae al genérico.
  let summary: CommercialSummary | null = null;
  let lastError: { error?: string; status?: number } | null = null;
  for (let attempt = 0; attempt < 2 && !summary; attempt++) {
    const result = await callGroq(callParams);
    if (!result.ok) {
      lastError = { error: result.error, status: result.status };
      continue;
    }
    summary = extractSummary(result.content);
  }

  // Si Groq falló (p. ej. 429/daily limit) en ambos intentos y nunca hubo texto
  // usable, propagamos el error para que el cliente muestre "reintentar".
  if (!summary && lastError) {
    return NextResponse.json({ error: lastError.error }, { status: lastError.status ?? 502 });
  }

  // Último recurso: Groq respondió pero el JSON nunca fue válido. Usamos el
  // genérico para no romper el flujo, pero lo dejamos registrado.
  if (!summary) {
    console.error("commercial-summary: JSON inválido tras reintento, usando fallback genérico.");
    summary = isEn ? FALLBACK_SUMMARY_EN : FALLBACK_SUMMARY_ES;
  }

  return NextResponse.json({ summary });
}
