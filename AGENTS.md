<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Metodología del proyecto (seguridad por diseño)

Este proyecto se trabaja con tres flujos, todos con la seguridad diseñada desde el
inicio — nunca como parche al final. Los prompts listos para pegar están en
`docs/prompts/` y el motor de El Arquitecto en `docs/the-architect/`.

1. **Diseñar** (`docs/prompts/1-disenar-blueprint.md`): El Arquitecto entrevista y
   genera un `BLUEPRINT.md` que SIEMPRE define autenticación y registro (§8), roles
   y permisos, protección de endpoints/rutas, rate limiting y manejo de datos
   sensibles (§16). Si falta info de seguridad, se pregunta ANTES de generar.
2. **Construir** (`docs/prompts/2-construir-desde-blueprint.md`): se lee el plano
   completo primero y se construye en el orden de la §9, bloque por bloque. No se
   salta la seguridad; cada endpoint/ruta nace con su control de acceso y su límite.
   Resumen + confirmación al terminar cada bloque; parar y preguntar ante cualquier
   decisión de seguridad sin definir.
3. **Remediar** (`docs/prompts/3-remediar-seguridad.md`): tras `/cyber-neo .`, se
   arregla de arriba hacia abajo — primero Critical, luego High, un hallazgo a la
   vez y avisando antes de tocar código; Medium/Low se listan para una segunda ronda.

## Reglas de seguridad no negociables al tocar esta app

- Validar TODA entrada de las rutas API con Zod, con límites de tamaño (evitar abuso
  del presupuesto de Groq).
- Ningún endpoint nuevo sin su rate limit (ver `src/lib/rateLimit.ts`) y, si aplica,
  su control de origen/acceso.
- Secretos solo del lado del servidor (`process.env`, nunca `NEXT_PUBLIC_` para
  claves). Nunca commitear `.env.local`.
- Mantener las cabeceras de seguridad de `next.config.ts` (CSP, HSTS, etc.).
- No exponer detalles de errores de terceros (Groq/Resend) al cliente.
