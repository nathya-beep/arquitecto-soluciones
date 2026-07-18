# docs/ — Metodología y tooling del proyecto

Documentación y prompts de trabajo de **Arquitecto de Soluciones**. No forma parte
del build de Next.js (Vercel solo compila `src/`); son guías para desarrollar la app
con seguridad desde el inicio.

## `prompts/` — prompts listos para pegar
| Archivo | Para qué |
|---------|----------|
| `1-disenar-blueprint.md` | Diseñar una idea/funcionalidad nueva con El Arquitecto (genera `BLUEPRINT.md` con seguridad §8/§16). |
| `2-construir-desde-blueprint.md` | Construir desde un `BLUEPRINT.md`, en orden (§9), sin saltarse la seguridad. |
| `3-remediar-seguridad.md` | Arreglar el reporte de `/cyber-neo` de arriba hacia abajo (Critical → High). |

## `the-architect/` — motor de El Arquitecto
Meta-agente que produce blueprints. Sus plantillas ya vienen con **disciplina de
construcción security-first**:
- `templates/blueprint-template.md` — §9 con orden security-first y confirmación por bloque.
- `templates/claude-md-template.md` — sección obligatoria "Building From the Blueprint".
- `templates/build-prompt.md` — prompt de construcción reutilizable (ES/EN).
- `CLAUDE.md` — reglas de seguridad por diseño del propio meta-agente.

Ver también la sección **"Metodología del proyecto"** en el `AGENTS.md` de la raíz.
