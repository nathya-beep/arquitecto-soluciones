import type { NextRequest } from "next/server";

// Rate limiter en memoria (ventana fija). En Vercel serverless el estado es por
// instancia y se reinicia en cold starts, así que NO es un límite global exacto,
// pero frena ráfagas de abuso desde una misma IP sin depender de servicios
// externos. Para un límite estricto global, migrar a Upstash Redis.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limpieza perezosa para que el Map no crezca sin fin.
function sweep(now: number) {
  if (buckets.size <= 500) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Permite `limit` peticiones por `windowMs` para una `key` dada.
 * Nota: usa Date.now(); si no está disponible, degrada a "permitir" (no bloquea).
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  let now: number;
  try {
    now = Date.now();
  } catch {
    return { ok: true, remaining: limit, retryAfterMs: 0 };
  }
  sweep(now);

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }

  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfterMs: 0 };
}

/**
 * IP del cliente. IMPORTANTE: `x-forwarded-for` es una cabecera que el propio
 * cliente puede enviar, y el PRIMER valor es controlable por él → tomarlo
 * permitía saltarse el rate limit rotando la cabecera. En Vercel:
 *  1) `request.ip` es la IP real que inyecta la plataforma (fuente fiable).
 *  2) Si no está, el ÚLTIMO salto de `x-forwarded-for` lo añade la
 *     infraestructura, no el cliente, así que es más fiable que el primero.
 */
export function clientIp(request: NextRequest): string {
  const vercelIp = (request as unknown as { ip?: string }).ip;
  if (vercelIp) return vercelIp;

  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return request.headers.get("x-real-ip") || "unknown";
}
