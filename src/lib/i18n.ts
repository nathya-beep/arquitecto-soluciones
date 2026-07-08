// Internacionalización simple ES/EN. El diccionario tiene la MISMA forma en
// ambos idiomas; `useLang()` (ver components/LangProvider) entrega el idioma
// actual y `t = dict[lang]`.

export type Lang = "es" | "en";

export const LANGS: Lang[] = ["es", "en"];
export const DEFAULT_LANG: Lang = "es";
export const LANG_STORAGE_KEY = "arquitecto_lang";

/** Saludo inicial que dispara la primera pregunta de la IA (uno por idioma). */
export const GREETINGS: Record<Lang, string> = {
  es: "Hola, estoy listo para comenzar.",
  en: "Hi, I'm ready to start.",
};

/** Todos los saludos posibles (para ocultarlos del chat sin importar el idioma). */
export const ALL_GREETINGS: string[] = Object.values(GREETINGS);

/** Títulos por defecto en cualquier idioma (para detectar sesiones sin renombrar). */
export const DEFAULT_TITLES: string[] = ["Nueva sesión", "New session"];

export interface Dict {
  brand: string;
  home: string;
  // Landing
  landingTagline: string;
  landingSubtitlePre: string;
  landingSubtitlePost: string;
  ctaStart: string;
  features: { title: string; desc: string }[];
  // Dashboard
  myProjects: string;
  swipeHint: string;
  newProject: string;
  noProjects: string;
  noProjectsDesc: string;
  createFirst: string;
  deleteLabel: string;
  confirmDelete: string;
  messagesWord: string;
  newSessionTitle: string;
  // Contact form
  beforeStart: string;
  whoAreYou: string;
  contactSubtitle: string;
  labelName: string;
  labelEmail: string;
  labelWhatsapp: string;
  labelCompany: string;
  optional: string;
  phName: string;
  phEmail: string;
  phWhatsapp: string;
  phCompany: string;
  startInterview: string;
  contactHelper: string;
  errName: string;
  errContactMethod: string;
  errEmail: string;
  // Phases
  phaseExploration: string;
  phaseStructuring: string;
  phaseGeneration: string;
  phaseDone: string;
  promptMasterReady: string;
  // Session
  loading: string;
  inputPlaceholder: string;
  inputHint: string;
  errAI: string;
  errConnection: string;
  errGeneric: string;
  errConnectionRetry: string;
  // Prompt Master card
  pmTitle: string;
  pmSubtitle: string;
  pmDownload: string;
  pmCopy: string;
  pmCopied: string;
  pmView: string;
  pmHide: string;
  // Commercial summary
  csBadge: string;
  csProblem: string;
  csBenefits: string;
  csHowItWorks: string;
  csRoi: string;
  csSending: string;
  csSentTo: string; // {email} placeholder
  csPending: string; // {email} placeholder
}

const es: Dict = {
  brand: "Arquitecto de Soluciones",
  home: "Inicio",
  landingTagline:
    "Describe lo que te quita tiempo. Te ayudamos a convertirlo en una herramienta de IA.",
  landingSubtitlePre: "Una entrevista guiada transforma tu conocimiento en un ",
  landingSubtitlePost:
    " técnico, listo para que otra IA construya la herramienta que necesitas.",
  ctaStart: "Empezar ahora",
  features: [
    {
      title: "Entrevista inteligente",
      desc: "El Arquitecto hace una pregunta a la vez para extraer el problema real.",
    },
    {
      title: "Resumen estructurado",
      desc: "Genera un resumen editable que puedes confirmar o corregir.",
    },
    {
      title: "Propuesta comercial",
      desc: "Recibe por email una presentación lista para vender tu automatización.",
    },
  ],
  myProjects: "Mis proyectos",
  swipeHint: "En móvil desliza ← para eliminar",
  newProject: "Nuevo proyecto",
  noProjects: "Sin proyectos todavía",
  noProjectsDesc: "Crea tu primer proyecto y empieza la entrevista.",
  createFirst: "Crear primer proyecto",
  deleteLabel: "Eliminar",
  confirmDelete: "¿Eliminar este proyecto?",
  messagesWord: "mensajes",
  newSessionTitle: "Nueva sesión",
  beforeStart: "Antes de empezar",
  whoAreYou: "¿Con quién hablamos?",
  contactSubtitle: "Déjanos tus datos para enviarte la propuesta de tu automatización.",
  labelName: "Nombre",
  labelEmail: "Email",
  labelWhatsapp: "WhatsApp",
  labelCompany: "Empresa",
  optional: "(opcional)",
  phName: "Tu nombre",
  phEmail: "tu@email.com",
  phWhatsapp: "+1 809 000 0000",
  phCompany: "Nombre de tu empresa",
  startInterview: "Empezar la entrevista",
  contactHelper: "Indica al menos email o WhatsApp. Usaremos tus datos solo para enviarte la propuesta.",
  errName: "Escribe tu nombre.",
  errContactMethod: "Déjanos al menos un medio de contacto: email o WhatsApp.",
  errEmail: "Ese email no parece válido.",
  phaseExploration: "Exploración",
  phaseStructuring: "Estructuración",
  phaseGeneration: "Generación",
  phaseDone: "Completado",
  promptMasterReady: "Prompt Master listo",
  loading: "Iniciando sesión...",
  inputPlaceholder: "Escribe tu respuesta... (Enter para enviar)",
  inputHint: "Enter para enviar · Shift+Enter para nueva línea",
  errAI: "Error al contactar la IA",
  errConnection: "Error de conexión.",
  errGeneric: "Error",
  errConnectionRetry: "Error de conexión. Intenta de nuevo.",
  pmTitle: "Prompt Master técnico",
  pmSubtitle: "Tu especificación lista para construir la herramienta",
  pmDownload: "Descargar .md",
  pmCopy: "Copiar",
  pmCopied: "Copiado",
  pmView: "Ver contenido",
  pmHide: "Ocultar",
  csBadge: "Propuesta de Automatización",
  csProblem: "El Problema",
  csBenefits: "Beneficios Clave",
  csHowItWorks: "Cómo Funciona",
  csRoi: "Retorno de Inversión Estimado",
  csSending: "Generando y enviando propuesta...",
  csSentTo: "Propuesta enviada a {email}",
  csPending: "Pendiente de envío — revisa {email}",
};

const en: Dict = {
  brand: "Solutions Architect",
  home: "Home",
  landingTagline:
    "Describe what's eating your time. We help you turn it into an AI tool.",
  landingSubtitlePre: "A guided interview turns your knowledge into a technical ",
  landingSubtitlePost:
    ", ready for another AI to build the tool you need.",
  ctaStart: "Start now",
  features: [
    {
      title: "Smart interview",
      desc: "The Architect asks one question at a time to uncover the real problem.",
    },
    {
      title: "Structured summary",
      desc: "It generates an editable summary you can confirm or correct.",
    },
    {
      title: "Commercial proposal",
      desc: "Get an email with a ready-to-sell presentation of your automation.",
    },
  ],
  myProjects: "My projects",
  swipeHint: "On mobile, swipe ← to delete",
  newProject: "New project",
  noProjects: "No projects yet",
  noProjectsDesc: "Create your first project and start the interview.",
  createFirst: "Create first project",
  deleteLabel: "Delete",
  confirmDelete: "Delete this project?",
  messagesWord: "messages",
  newSessionTitle: "New session",
  beforeStart: "Before we start",
  whoAreYou: "Who are we speaking with?",
  contactSubtitle: "Leave your details so we can send you your automation proposal.",
  labelName: "Name",
  labelEmail: "Email",
  labelWhatsapp: "WhatsApp",
  labelCompany: "Company",
  optional: "(optional)",
  phName: "Your name",
  phEmail: "you@email.com",
  phWhatsapp: "+1 809 000 0000",
  phCompany: "Your company name",
  startInterview: "Start the interview",
  contactHelper: "Provide at least email or WhatsApp. We'll only use your details to send you the proposal.",
  errName: "Please enter your name.",
  errContactMethod: "Leave at least one contact method: email or WhatsApp.",
  errEmail: "That email doesn't look valid.",
  phaseExploration: "Exploration",
  phaseStructuring: "Structuring",
  phaseGeneration: "Generation",
  phaseDone: "Completed",
  promptMasterReady: "Prompt Master ready",
  loading: "Loading session...",
  inputPlaceholder: "Type your answer... (Enter to send)",
  inputHint: "Enter to send · Shift+Enter for a new line",
  errAI: "Error contacting the AI",
  errConnection: "Connection error.",
  errGeneric: "Error",
  errConnectionRetry: "Connection error. Please try again.",
  pmTitle: "Technical Prompt Master",
  pmSubtitle: "Your spec, ready to build the tool",
  pmDownload: "Download .md",
  pmCopy: "Copy",
  pmCopied: "Copied",
  pmView: "View content",
  pmHide: "Hide",
  csBadge: "Automation Proposal",
  csProblem: "The Problem",
  csBenefits: "Key Benefits",
  csHowItWorks: "How It Works",
  csRoi: "Estimated ROI",
  csSending: "Generating and sending proposal...",
  csSentTo: "Proposal sent to {email}",
  csPending: "Pending delivery — check {email}",
};

const DICTS: Record<Lang, Dict> = { es, en };

export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? DICTS[DEFAULT_LANG];
}

import type { Phase } from "./types";

/** Etiqueta traducida de una fase de la sesión. */
export function phaseLabel(t: Dict, phase: Phase): string {
  switch (phase) {
    case "exploration":
      return t.phaseExploration;
    case "structuring":
      return t.phaseStructuring;
    case "generation":
      return t.phaseGeneration;
    case "done":
      return t.phaseDone;
  }
}

/** Fecha/hora localizadas según idioma. */
export const DATE_LOCALE: Record<Lang, string> = { es: "es-ES", en: "en-US" };
