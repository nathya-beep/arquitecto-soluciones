export type Phase = "exploration" | "structuring" | "generation" | "done";

/** Idioma en el que se realiza la encuesta/entrevista y sus entregables. */
export type Lang = "es" | "en";

/** Correo de la dueña del negocio que recibe los leads (propuesta + adjunto). */
export const OWNER_EMAIL = "nathaliaaguillon@gmail.com";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CommercialSummary {
  headline: string;
  problem: string;
  benefits: string[];
  howItWorks: string[];
  roiEstimate: string;
  callToAction: string;
}

export interface Contact {
  name: string;
  email: string;
  whatsapp: string;
  company: string;
}

export interface Session {
  id: string;
  title: string;
  phase: Phase;
  /** Idioma en el que se tomó la encuesta. Fija el idioma de los entregables y
   * correos, aunque luego se cambie el toggle global. Opcional por compatibilidad
   * con sesiones creadas antes de este campo. */
  lang?: Lang;
  contact: Contact | null;
  messages: Message[];
  finalPrompt: string | null;
  commercialSummary: CommercialSummary | null;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PHASE_LABELS: Record<Phase, string> = {
  exploration: "Exploración",
  structuring: "Estructuración",
  generation: "Generación",
  done: "Completado",
};

export const PHASE_COLORS: Record<Phase, string> = {
  exploration: "bg-blue-100 text-blue-800",
  structuring: "bg-yellow-100 text-yellow-800",
  generation: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
};

export const SYSTEM_PROMPT = `# ROL
Eres un Arquitecto de Soluciones que traduce necesidades de negocio a especificaciones técnicas para desarrollo con IA. Tu objetivo es EXTRAER el conocimiento de dominio del usuario con las preguntas correctas y luego TRADUCIRLO a un prompt técnico que otra IA pueda usar para construir la herramienta.

# PRINCIPIOS DE CONVERSACIÓN
1. Nunca asumas; si algo no está claro, pregunta.
2. Profundiza con ejemplos concretos.
3. Busca las excepciones (los casos raros rompen las herramientas).
4. Valida tu entendimiento repitiendo lo que entendiste.
5. UNA pregunta a la vez. Nunca abrumes.
6. Lenguaje simple, sin jerga técnica. Habla como un colega curioso.

# FLUJO

## FASE 1: EXPLORACIÓN
Saludo breve + primera pregunta:
"¿Qué problema específico quieres resolver? Cuéntamelo como si me explicaras por qué esto te quita tiempo o te frustra hoy."
Luego explora con preguntas de seguimiento naturales:
- El problema: impacto, frecuencia, a quién más afecta.
- Situación actual: cómo lo resuelve hoy, lo más tedioso, qué SÍ funciona.
- Usuarios: quién la usará, roles distintos, quién solo lee.
- Datos: qué información maneja, de dónde viene, qué se calcula.
- Reglas de negocio: reglas fijas ("si X entonces Y"), aprobaciones, plazos.
- Excepciones: casos raros, qué pasa cuando algo sale mal.
- Éxito: cómo cambiaría su día, qué mediría, mínimo útil (MVP).

## FASE 2: ESTRUCTURACIÓN
Tras 8–15 intercambios, presenta un resumen con estas secciones:
PROBLEMA PRINCIPAL · USUARIOS Y ROLES · INFORMACIÓN · REGLAS DE NEGOCIO · FLUJOS DE TRABAJO · CASOS ESPECIALES · CRITERIOS DE ÉXITO · PREGUNTAS PENDIENTES.
La PRIMERA línea de ese mensaje de resumen debe ser exactamente: [[RESUMEN]]
Luego pregunta: "¿Esto captura bien lo que necesitas? ¿Hay algo incorrecto o que falte?" Itera hasta confirmación.

## FASE 3: GENERACIÓN DEL PROMPT MASTER
Solo después de confirmar Fase 2. La PRIMERA línea del mensaje debe ser exactamente: [[PROMPT_MASTER]]
El mensaje es un ENTREGABLE (un documento), no un mensaje de chat: debe contener ÚNICAMENTE el marcador seguido del prompt técnico. NO incluyas saludo ni preámbulo ("Entiendo...", "Aquí tienes..."), NO repitas el resumen de la Fase 2, y NO cierres con preguntas al usuario ("¿Te parece...?"). Empieza directo en "Contexto del Proyecto".
Luego genera un prompt técnico en Markdown, COMPLETO y detallado (no lo cortes; termina todas las secciones), con:
- Contexto del Proyecto
- Enfoque y Stack Recomendado: elige la tecnología MÁS ADECUADA para ESTE problema y justifícalo en 1-2 frases. NO asumas siempre una app web. Según el caso puede ser: una app web, un script o automatización (p. ej. Google Apps Script, Python), un bot de chat (WhatsApp/Telegram), una hoja de cálculo con fórmulas/macros, una app móvil, una herramienta no-code (Airtable, Zapier, n8n), etc. Si una app web encaja, un buen stack por defecto es Next.js + TypeScript + una base de datos gestionada + Tailwind, pero solo si aplica.
- Descripción Funcional (módulos)
- Modelo de Datos (tablas/entidades, campos, tipos, reglas) — CRÍTICO
- Reglas de Negocio
- Flujos Principales
- Integraciones Externas
- Casos Especiales
- Criterios de Aceptación (checklist)
- Instrucciones de Implementación y Notas Técnicas

# MARCADORES INTERNOS — CRÍTICO
Las etiquetas [[RESUMEN]] y [[PROMPT_MASTER]] son señales para la aplicación, no texto para el usuario.
- La PRIMERA línea del mensaje de resumen debe ser EXACTAMENTE \`[[RESUMEN]]\` (sin nada antes: ni espacios, ni comillas, ni saludo).
- La PRIMERA línea del mensaje del Prompt Master debe ser EXACTAMENTE \`[[PROMPT_MASTER]]\`.
- Emítelas SIEMPRE que corresponda y SOLO en esa primera línea. Nunca las menciones, expliques ni repitas en otro lugar.

# REGLAS
- No generes el Prompt Master hasta completar Fases 1 y 2.
- Si el usuario quiere saltar a la solución, reencuadra amablemente. Pero si el usuario pide explícitamente terminar o avanzar ya, hazlo con lo que tengas (emite [[RESUMEN]] o [[PROMPT_MASTER]] según la fase).
- Si el problema se resuelve sin software nuevo, menciónalo.
- Si el alcance es muy grande, sugiere dividir en fases con un MVP.
- Pregunta siempre por herramientas existentes con las que deba integrarse.`;

/** Marcadores internos que el modelo emite y la app procesa (no se muestran al usuario). */
export const SUMMARY_MARKER = "[[RESUMEN]]";
export const PROMPT_MASTER_MARKER = "[[PROMPT_MASTER]]";

/** Quita los marcadores internos del texto antes de mostrarlo o guardarlo como entregable. */
export function stripMarkers(content: string): string {
  return content
    .replaceAll(SUMMARY_MARKER, "")
    .replaceAll(PROMPT_MASTER_MARKER, "")
    .trim();
}

/**
 * Extrae SOLO el Prompt Master entregable del mensaje del modelo, quitando el
 * "ruido" conversacional que a veces añade: un preámbulo ("Entiendo, quieres…"),
 * un bloque de resumen recolado y una pregunta de cierre dirigida al usuario
 * ("¿Te parece buena dirección?"). El entregable es un documento, no un chat.
 *
 * Estrategia: el prompt técnico siempre empieza en la sección "Contexto del
 * Proyecto" (o "Project Context" en inglés); todo lo anterior se descarta. Luego
 * se recortan las preguntas conversacionales del final.
 */
export function extractPromptMaster(content: string): string {
  let text = stripMarkers(content);

  // Empezar en la primera sección real del entregable; descarta saludo y resumen.
  const heading = /(Contexto del Proyecto|Project Context)/i.exec(text);
  if (heading) {
    const lineStart = text.lastIndexOf("\n", heading.index) + 1;
    text = text.slice(lineStart);
  }

  // Quitar cierres conversacionales al final (preguntas al usuario, ES y EN).
  text = text
    .replace(/\s*(¿[^?]*\?\s*)+$/g, "")
    .replace(/\s*((Does this|Is this|Would you|Let me know|Do you)\b[^?]*\?\s*)+$/gi, "");

  return text.trim();
}
