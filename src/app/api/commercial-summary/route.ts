import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CommercialSummary } from "@/lib/types";

export const runtime = "edge";

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

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Sin API key" }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const isOAuth = apiKey.startsWith("sk-ant-oat");
  const authHeader = isOAuth
    ? { "Authorization": `Bearer ${apiKey}` }
    : { "x-api-key": apiKey };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        ...authHeader,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: COMMERCIAL_SYSTEM,
        messages: [{
          role: "user",
          content: `Especificación del proyecto "${parsed.data.title}":\n\n${parsed.data.finalPrompt}`,
        }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Error generando resumen" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "{}";

    let summary: CommercialSummary;
    try {
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      summary = JSON.parse(clean);
    } catch {
      summary = {
        headline: "Automatización que transforma tu negocio",
        problem: "Tu equipo dedica horas a tareas repetitivas que una herramienta inteligente puede resolver.",
        benefits: ["Ahorra horas de trabajo manual", "Elimina errores humanos", "Escala sin aumentar equipo", "Datos en tiempo real"],
        howItWorks: ["Captura información automáticamente", "Aplica reglas de negocio", "Entrega resultados en segundos"],
        roiEstimate: "Recupera la inversión en el primer mes",
        callToAction: "Implementa hoy y libera a tu equipo para lo que importa",
      };
    }

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Edge commercial error:", err);
    return NextResponse.json({ error: "Error generando resumen" }, { status: 502 });
  }
}
