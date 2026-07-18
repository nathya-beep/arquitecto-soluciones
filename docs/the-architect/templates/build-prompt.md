# Prompt de Construcción (Fase BUILD)

Este es el prompt que se le pasa a una sesión NUEVA de Claude Code, ya dentro del
proyecto destino (donde vive el `BLUEPRINT.md` que generó El Arquitecto), para
construirlo. Cópialo tal cual. Está diseñado para que la seguridad se construya
desde el inicio, no como parche final.

---

En la raíz de este proyecto está `BLUEPRINT.md`, el plano que generó El Arquitecto.
Léelo completo antes de escribir una sola línea.

Luego construye siguiendo el plano en su orden de construcción (sección 09), bloque
por bloque:

1. Respeta la estructura de directorios y el stack que define el plano.
2. No te saltes la seguridad: implementa la autenticación y los permisos (sección
   08), la protección de endpoints y los límites (rate limiting, sección 16) tal
   como están diseñados en el `BLUEPRINT.md`. Si un bloque depende de otro,
   constrúyelos en orden. Ningún endpoint o ruta se crea sin su control de acceso
   (y su rate limit cuando aplique) en el mismo bloque.
3. Maneja los datos sensibles como indica el plano: qué se cifra, qué no se guarda,
   qué no se expone.
4. Al terminar cada bloque, hazme un resumen corto de lo que hiciste y confirma
   conmigo antes de pasar al siguiente.
5. Si algo del plano no queda claro o encuentras una decisión de seguridad sin
   definir, párate y pregúntame — no la inventes ni la dejes para después.

Empieza por el primer bloque del orden de construcción.

---

## English version

In the root of this project is `BLUEPRINT.md`, the plan The Architect generated.
Read it completely before writing a single line of code.

Then build following the plan's build order (section 09), block by block:

1. Respect the directory structure and stack the plan defines.
2. Do not skip security: implement authentication and permissions (section 08),
   endpoint/route protection and rate limits (section 16) exactly as designed in
   `BLUEPRINT.md`. Build dependencies before dependents. No endpoint or route is
   created without its access control (and rate limit where applicable) in the
   same block.
3. Handle sensitive data as the plan specifies: what is encrypted, what is never
   stored, what is never exposed.
4. After each block, give me a short summary of what you did and confirm with me
   before moving to the next.
5. If anything in the plan is unclear, or you find an undefined security decision,
   stop and ask me — do not invent it or leave it for later.

Start with the first block of the build order.
