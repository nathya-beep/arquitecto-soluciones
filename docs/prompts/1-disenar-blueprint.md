# Prompt 1 — Diseñar (El Arquitecto)

Úsalo para diseñar una funcionalidad o proyecto nuevo con seguridad desde el
inicio. Rellena los corchetes y pégalo en una sesión de Claude Code con el motor
de El Arquitecto disponible en `docs/the-architect/`.

---

Quiero construir [DESCRIBE TU IDEA EN UNA O DOS LÍNEAS]. Es para [PARA QUIÉN ES:
clientes, equipo interno, tú mismo] y va a manejar [QUÉ DATOS: cuentas de usuario,
pagos, información personal, nada sensible].

Empieza la entrevista. Antes de generar el plano, quiero que la estructura del
proyecto y la seguridad queden diseñadas desde el inicio, no como un parche al
final. En el BLUEPRINT.md incluye explícitamente:
- Autenticación y registro (cómo entran y se identifican los usuarios) — sección 08.
- Permisos y roles (quién puede hacer qué).
- Protección de los endpoints y las rutas de la API.
- Límites de uso (rate limiting) donde haga falta — dentro de las restricciones y
  reglas, sección 16.
- Manejo de datos sensibles (qué se cifra, qué no se guarda, qué no se expone).

Hazme las preguntas que necesites para decidir bien estos puntos. Si te falta
información para diseñar la seguridad, pregúntamela antes de generar el plano.
