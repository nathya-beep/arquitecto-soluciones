import { describe, it, expect } from "vitest";
import { stripMarkers, extractPromptMaster, SUMMARY_MARKER, PROMPT_MASTER_MARKER } from "../types";
import { getDict, phaseLabel } from "../i18n";
import { parseResetMs } from "../groq";
import { rateLimit } from "../rateLimit";

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
