import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CommercialSummary, OWNER_EMAIL } from "@/lib/types";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const maxDuration = 30;

// Destinatario de los leads. Configurable por entorno; si no se define, usa el
// correo de la dueña por defecto (para no romper despliegues existentes).
const OWNER_TO = (process.env.OWNER_EMAIL ?? "").trim() || OWNER_EMAIL;

// Límites de tamaño para evitar payloads abusivos hacia el envío de correo.
const RequestSchema = z.object({
  projectTitle: z.string().max(300),
  contact: z
    .object({
      name: z.string().max(200),
      email: z.string().max(200),
      whatsapp: z.string().max(60),
      company: z.string().max(200),
    })
    .nullable()
    .optional(),
  commercialSummary: z.object({
    headline: z.string().max(500),
    problem: z.string().max(3000),
    benefits: z.array(z.string().max(500)).max(20),
    howItWorks: z.array(z.string().max(500)).max(20),
    roiEstimate: z.string().max(2000),
    callToAction: z.string().max(1000),
  }),
  finalPrompt: z.string().max(60_000),
  lang: z.enum(["es", "en"]).optional(),
});

type Contact = z.infer<typeof RequestSchema>["contact"];
type Lang = "es" | "en";

// --- Configuración de Resend ---------------------------------------------
// Remitente para el correo a la DUEÑA. `onboarding@resend.dev` funciona sin
// dominio propio, pero Resend solo lo entrega a la cuenta dueña (la que registró
// el correo OWNER_EMAIL en Resend).
const RESEND_FROM =
  (process.env.RESEND_FROM ?? "").trim() || "Arquitecto de Soluciones <onboarding@resend.dev>";
// Remitente para el correo al LEAD (su propio email). Idealmente un DOMINIO
// VERIFICADO en Resend (ej: "Propuestas <propuestas@tudominio.com>") para poder
// entregar a CUALQUIER prospecto. Si está vacío, se usa RESEND_FROM como remitente
// (con onboarding@resend.dev Resend solo entrega a la dirección dueña de la cuenta).
const RESEND_LEAD_FROM = (process.env.RESEND_LEAD_FROM ?? "").trim();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STR: Record<Lang, Record<string, string>> = {
  es: {
    newLead: "Nuevo lead",
    subjectOwner: "Nuevo lead",
    subjectLead: "Tu propuesta de automatización",
    prospectData: "Datos del prospecto",
    name: "Nombre",
    email: "Email",
    whatsapp: "WhatsApp",
    company: "Empresa",
    problem: "El problema",
    benefits: "Beneficios clave",
    howItWorks: "Cómo funciona",
    roi: "ROI estimado",
    nextStep: "Próximo paso",
    attachmentNote:
      "La especificación técnica completa (Prompt Master) va adjunta como archivo .md.",
    leadHi: "Hola",
    leadIntro:
      "Gracias por tu interés. Aquí tienes la propuesta de automatización que preparamos para ti:",
    leadOutro: "Te contactaremos pronto para dar el siguiente paso.",
  },
  en: {
    newLead: "New lead",
    subjectOwner: "New lead",
    subjectLead: "Your automation proposal",
    prospectData: "Prospect details",
    name: "Name",
    email: "Email",
    whatsapp: "WhatsApp",
    company: "Company",
    problem: "The problem",
    benefits: "Key benefits",
    howItWorks: "How it works",
    roi: "Estimated ROI",
    nextStep: "Next step",
    attachmentNote:
      "The full technical specification (Prompt Master) is attached as a .md file.",
    leadHi: "Hi",
    leadIntro:
      "Thanks for your interest. Here's the automation proposal we prepared for you:",
    leadOutro: "We'll reach out soon to take the next step.",
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(text: string): string {
  const noAccents = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return noAccents.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "proyecto";
}

const H2 =
  'style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:20px 0 4px"';

/** Bloque HTML compartido: encabezado + propuesta comercial (SIN Prompt Master). */
function proposalBlocks(projectTitle: string, cs: CommercialSummary, s: Record<string, string>, badge: string): string {
  return `
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:24px;border-radius:16px;text-align:center">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">${escapeHtml(badge)}</div>
    <h1 style="margin:6px 0 0;font-size:22px">${escapeHtml(cs.headline)}</h1>
    <div style="opacity:.85;font-size:14px;margin-top:4px">${escapeHtml(projectTitle)}</div>
  </div>

  <h2 ${H2}>${escapeHtml(s.problem)}</h2>
  <p>${escapeHtml(cs.problem)}</p>

  <h2 ${H2}>${escapeHtml(s.benefits)}</h2>
  <ul>${cs.benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>

  <h2 ${H2}>${escapeHtml(s.howItWorks)}</h2>
  <ol>${cs.howItWorks.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>

  <h2 ${H2}>${escapeHtml(s.roi)}</h2>
  <p style="background:#ecfdf5;border-radius:10px;padding:12px">${escapeHtml(cs.roiEstimate)}</p>

  <h2 ${H2}>${escapeHtml(s.nextStep)}</h2>
  <p>${escapeHtml(cs.callToAction)}</p>`;
}

/** Correo a la DUEÑA: datos del prospecto + propuesta + nota del adjunto (sin texto del prompt). */
function ownerHtml(projectTitle: string, contact: Contact, cs: CommercialSummary, s: Record<string, string>): string {
  const contactRows = contact
    ? `
    <h2 ${H2}>${escapeHtml(s.prospectData)}</h2>
    <table style="width:100%;border-collapse:collapse;margin:8px 0 4px">
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600;width:120px">${escapeHtml(s.name)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.name || "—")}</td></tr>
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600">${escapeHtml(s.email)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.email || "—")}</td></tr>
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600">${escapeHtml(s.whatsapp)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.whatsapp || "—")}</td></tr>
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600">${escapeHtml(s.company)}</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.company || "—")}</td></tr>
    </table>`
    : "";

  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:640px;margin:0 auto;padding:16px">
  ${proposalBlocks(projectTitle, cs, s, s.newLead)}
  ${contactRows}
  <p style="margin-top:20px;background:#f1f5f9;border-radius:10px;padding:12px;font-size:13px;color:#475569">📎 ${escapeHtml(s.attachmentNote)}</p>
</body></html>`;
}

/** Correo al LEAD: solo la propuesta (sin datos internos, sin adjunto, sin mención al Prompt Master). */
function leadHtml(projectTitle: string, contact: Contact, cs: CommercialSummary, s: Record<string, string>): string {
  const name = contact?.name ? ` ${contact.name}` : "";
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:640px;margin:0 auto;padding:16px">
  <p style="font-size:16px">${escapeHtml(s.leadHi)}${escapeHtml(name)},</p>
  <p>${escapeHtml(s.leadIntro)}</p>
  ${proposalBlocks(projectTitle, cs, s, s.subjectLead)}
  <p style="margin-top:20px">${escapeHtml(s.leadOutro)}</p>
</body></html>`;
}

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
  attachments?: { filename: string; content: string }[];
}

async function sendViaResend(apiKey: string, payload: ResendPayload): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };
  const errText = await res.text().catch(() => "");
  console.error("Resend error:", res.status, errText);
  return { ok: false, error: errText || `Resend ${res.status}` };
}

export async function POST(request: NextRequest) {
  // Rate limiting ESTRICTO: este endpoint envía correos. Límite bajo por IP para
  // evitar que se use como relay de spam (sobre todo cuando RESEND_LEAD_FROM
  // está activo y se envía al email del lead). Máx 6 por hora.
  const ip = clientIp(request);
  const limited = rateLimit(`email:${ip}`, 6, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Demasiados envíos. Intenta más tarde." }, { status: 429 });
  }

  // Solo aceptamos peticiones del propio sitio (bloquea curl/relay ingenuo).
  // Comparamos el HOST exacto del Origin contra el Host de la petición. Usar
  // endsWith permitía bypass por sufijo (p. ej. "https://evil-miapp.com").
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost !== host) {
      return NextResponse.json({ ok: false, error: "Origen no permitido." }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { projectTitle, contact, commercialSummary: cs, finalPrompt } = parsed.data;
  const lang: Lang = parsed.data.lang === "en" ? "en" : "es";
  const s = STR[lang];

  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) {
    // Sin Resend configurado no podemos enviar (adjunto + correo al lead lo exigen).
    return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 200 });
  }

  const who = contact?.name ? ` — ${contact.name}` : "";
  const replyTo = contact?.email && EMAIL_RE.test(contact.email) ? contact.email : undefined;
  const attachment = {
    filename: `Prompt-Master-${slugify(projectTitle)}.md`,
    content: Buffer.from(finalPrompt, "utf-8").toString("base64"),
  };

  // 1) Correo a la DUEÑA (propuesta + adjunto .md; sin texto del prompt en el cuerpo).
  const owner = await sendViaResend(apiKey, {
    from: RESEND_FROM,
    to: [OWNER_TO],
    subject: `${s.subjectOwner}${who}: ${projectTitle}`,
    html: ownerHtml(projectTitle, contact, cs, s),
    ...(replyTo ? { reply_to: replyTo } : {}),
    attachments: [attachment],
  });

  // 2) Correo al LEAD (solo la propuesta, sin datos internos ni adjunto), en el
  // idioma de la encuesta. Se envía siempre que el lead dejó un email válido.
  // Usa el remitente de dominio verificado si existe; si no, cae a RESEND_FROM.
  // NOTA: para entregar a prospectos arbitrarios hace falta un DOMINIO VERIFICADO
  // en Resend + RESEND_LEAD_FROM; con onboarding@resend.dev Resend solo entrega a
  // la dirección dueña de la cuenta (modo prueba) y el resto fallará (leadSent=false).
  let leadSent = false;
  if (replyTo) {
    const lead = await sendViaResend(apiKey, {
      from: RESEND_LEAD_FROM || RESEND_FROM,
      to: [replyTo],
      subject: `${s.subjectLead}: ${projectTitle}`,
      html: leadHtml(projectTitle, contact, cs, s),
      // Si el prospecto responde, que le llegue a la dueña.
      reply_to: OWNER_TO,
    });
    leadSent = lead.ok;
  }

  if (!owner.ok) {
    return NextResponse.json(
      { ok: false, ownerSent: false, leadSent, error: "owner_send_failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, ownerSent: true, leadSent, via: "resend" });
}
