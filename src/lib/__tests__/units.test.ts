import { describe, it, expect } from "vitest";
import { stripMarkers, extractPromptMaster, SUMMARY_MARKER, PROMPT_MASTER_MARKER } from "../types";
import { getDict, phaseLabel } from "../i18n";
import { parseResetMs, parseGroqSseChunks, callGroqStream } from "../groq";
import { rateLimit } from "../rateLimit";
import { trimHistory } from "../../app/api/chat/route";

describe("stripMarkers", () => {
  it("quita los marcadores internos y recorta", () => {
    expect(stripMarkers(`${SUMMARY_MARKER}\nHola`)).toBe("Hola");
    expect(stripMarkers(`${PROMPT_MASTER_MARKER}\n# Spec`)).toBe("# Spec");
  });
  it("no cambia texto sin marcadores", () => {
    expect(stripMarkers("solo texto")).toBe("solo texto");
  });
});

describe("extractPromptMaster", () => {
  it("descarta preámbulo, bloque de resumen y pregunta de cierre", () => {
    const raw = `${PROMPT_MASTER_MARKER}
Entiendo. Quieres algo sencillo que se integre con WhatsApp.

****
PROBLEMA PRINCIPAL: Pérdida de citas.
* USUARIOS Y ROLES: Rosa la secretaria.
****

**Contexto del Proyecto**
La clínica dental necesita recordar citas por WhatsApp.

**Modelo de Datos**
Pacientes, Citas.

¿Te parece que esta es una buena dirección? ¿Quieres cambiar algo?`;
    const out = extractPromptMaster(raw);
    expect(out.startsWith("**Contexto del Proyecto**")).toBe(true);
    expect(out).toContain("Modelo de Datos");
    expect(out).not.toContain("Entiendo");
    expect(out).not.toContain("PROBLEMA PRINCIPAL");
    expect(out).not.toContain("¿Te parece");
    expect(out).not.toContain(PROMPT_MASTER_MARKER);
  });

  it("recorta el cierre conversacional en inglés", () => {
    const raw = `Project Context\nThe clinic needs reminders.\n\nDoes this cover what you need?`;
    const out = extractPromptMaster(raw);
    expect(out.startsWith("Project Context")).toBe(true);
    expect(out).not.toMatch(/Does this/i);
  });

  it("si no hay encabezado de sección, deja el texto (sin preguntas finales)", () => {
    const out = extractPromptMaster("Especificación libre sin encabezado estándar.");
    expect(out).toBe("Especificación libre sin encabezado estándar.");
  });
});

describe("i18n", () => {
  it("devuelve el diccionario del idioma", () => {
    expect(getDict("en").ctaStart).toBe("Start now");
    expect(getDict("es").ctaStart).toBe("Empezar ahora");
  });
  it("phaseLabel traduce por idioma", () => {
    expect(phaseLabel(getDict("en"), "done")).toBe("Completed");
    expect(phaseLabel(getDict("es"), "exploration")).toBe("Exploración");
  });
});

describe("parseResetMs", () => {
  it("parsea segundos y milisegundos", () => {
    expect(parseResetMs("235ms")).toBe(235);
    expect(parseResetMs("6.5s")).toBe(6500);
  });
  it("parsea minutos + segundos (sin confundir 'ms' con 'm')", () => {
    expect(parseResetMs("1m26.4s")).toBeCloseTo(86400, 0);
    expect(parseResetMs("16m25s")).toBe(985000);
  });
  it("devuelve null para vacío o cero", () => {
    expect(parseResetMs(null)).toBeNull();
    expect(parseResetMs("0s")).toBeNull();
  });
});

describe("parseGroqSseChunks", () => {
  it("parsea deltas con chunks partidos en límites arbitrarios", () => {
    const sse = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Ho" }, finish_reason: null }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: "la" }, finish_reason: null }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\n`,
      "data: [DONE]\n\n",
    ].join("");

    const chunks = [sse.slice(0, 7), sse.slice(7, 31), sse.slice(31, 58), sse.slice(58, 101), sse.slice(101)];
    const parsed = parseGroqSseChunks(chunks);

    expect(parsed.deltas.join("")).toBe("Hola");
    expect(parsed.finishReason).toBe("stop");
    expect(parsed.done).toBe(true);
  });

  it("detecta finish_reason length para continuaciones", () => {
    const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: "corte" }, finish_reason: null }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "length" }] })}\n\n`;

    const parsed = parseGroqSseChunks([sse.slice(0, 13), sse.slice(13)]);
    expect(parsed.deltas).toEqual(["corte"]);
    expect(parsed.finishReason).toBe("length");
  });
});

describe("rateLimit", () => {
  it("permite hasta el límite y luego bloquea", () => {
    const key = `test-${Math.round(performance.now())}-${Math.random()}`;
    const r1 = rateLimit(key, 2, 60_000);
    const r2 = rateLimit(key, 2, 60_000);
    const r3 = rateLimit(key, 2, 60_000);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfterMs).toBeGreaterThan(0);
  });
});

describe("callGroqStream", () => {
  it("devuelve un stream de BYTES consumible como cuerpo de Response", async () => {
    // Contrato Fetch: los chunks del body deben ser Uint8Array; si se encolan
    // strings, Response.text() revienta en el runtime Node (undici).
    const sse =
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Ho" }, finish_reason: null }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: { content: "la" }, finish_reason: "stop" }] })}\n\n` +
      "data: [DONE]\n\n";

    const upstream = () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sse));
            controller.close();
          },
        }),
        { status: 200 }
      );

    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GROQ_API_KEY;
    globalThis.fetch = (async () => upstream()) as typeof fetch;
    process.env.GROQ_API_KEY = "gsk_test_key";

    try {
      const result = await callGroqStream({ messages: [{ role: "user", content: "hola" }] });
      expect(result.ok).toBe(true);
      const text = await new Response(result.stream).text();
      expect(text).toBe("Hola");
    } finally {
      globalThis.fetch = originalFetch;
      process.env.GROQ_API_KEY = originalKey;
    }
  });
});

describe("trimHistory", () => {
  it("conserva los primeros mensajes y el [[RESUMEN]] respetando presupuesto", () => {
    const messages = [
      { role: "user" as const, content: "primer mensaje importante" },
      { role: "assistant" as const, content: "primera respuesta importante" },
      { role: "user" as const, content: "x".repeat(300) },
      { role: "assistant" as const, content: `${SUMMARY_MARKER}\nResumen compacto` },
      { role: "user" as const, content: "y".repeat(300) },
      { role: "assistant" as const, content: "última respuesta" },
    ];

    const trimmed = trimHistory(messages, 220);
    const total = trimmed.reduce((sum, m) => sum + m.content.length + m.role.length + 8, 0);

    expect(trimmed[0]).toBe(messages[0]);
    expect(trimmed[1]).toBe(messages[1]);
    expect(trimmed.some((m) => m.content.includes(SUMMARY_MARKER))).toBe(true);
    expect(trimmed.some((m) => m.content === "[…mensajes anteriores omitidos…]")).toBe(true);
    expect(total).toBeLessThanOrEqual(220);
  });

  it("devuelve el historial intacto cuando cabe en el presupuesto", () => {
    const messages = [
      { role: "user" as const, content: "hola" },
      { role: "assistant" as const, content: "respuesta" },
    ];

    expect(trimHistory(messages, 1000)).toBe(messages);
  });
});
