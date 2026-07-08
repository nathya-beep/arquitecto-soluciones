import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CommercialSummary } from "@/lib/types";
import { callGroq, GROQ_MODEL_FAST } from "@/lib/groq";

const RequestSchema = z.object({
  finalPrompt: z.string().min(1),
  title: z.string(),
});

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

const FALLBACK_SUMMARY: CommercialSummary = {
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
      { role: "system", content: COMMERCIAL_SYSTEM },
      {
        role: "user",
        content: `Aquí está la especificación técnica del proyecto "${parsed.data.title}":\n\n${parsed.data.finalPrompt}`,
      },
    ],
    maxTokens: 1024,
    temperature: 0.5,
    // Modelo rápido: reserva el presupuesto diario del 70b para el Prompt Master.
    model: GROQ_MODEL_FAST,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  let summary: CommercialSummary;
  try {
    const clean = (result.content ?? "{}")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    summary = JSON.parse(clean);
  } catch {
    summary = FALLBACK_SUMMARY;
  }

  return NextResponse.json({ summary });
}
