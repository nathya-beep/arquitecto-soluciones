import { describe, it, expect } from "vitest";
import { stripMarkers, SUMMARY_MARKER, PROMPT_MASTER_MARKER } from "../types";
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
