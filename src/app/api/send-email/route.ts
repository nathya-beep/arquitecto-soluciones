import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  projectTitle: z.string(),
  contact: z
    .object({
      name: z.string(),
      email: z.string(),
      whatsapp: z.string(),
      company: z.string(),
    })
    .nullable()
    .optional(),
  commercialSummary: z.object({
    headline: z.string(),
    problem: z.string(),
    benefits: z.array(z.string()),
    howItWorks: z.array(z.string()),
    roiEstimate: z.string(),
    callToAction: z.string(),
  }),
  finalPrompt: z.string(),
});

const RECIPIENT = "nathaliaaguillon@gmail.com";
// Remitente de Resend válido sin dominio propio (solo entrega al dueño de la cuenta).
const RESEND_FROM = "Arquitecto de Soluciones <onboarding@resend.dev>";

type Contact = z.infer<typeof RequestSchema>["contact"];
type CommercialSummary = z.infer<typeof RequestSchema>["commercialSummary"];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildText(
  projectTitle: string,
  contact: Contact,
  cs: CommercialSummary,
  finalPrompt: string
): string {
  const contactBlock = contact
    ? `DATOS DEL PROSPECTO (LEAD)
--------------------------
Nombre:   ${contact.name || "—"}
Email:    ${contact.email || "—"}
WhatsApp: ${contact.whatsapp || "—"}
Empresa:  ${contact.company || "—"}

---
`
    : "";

  return `
PROPUESTA DE AUTOMATIZACIÓN
============================
${cs.headline}

PROYECTO: ${projectTitle}

---

${contactBlock}EL PROBLEMA
-----------
${cs.problem}

---

BENEFICIOS CLAVE
----------------
${cs.benefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}

---

CÓMO FUNCIONA
-------------
${cs.howItWorks.map((s, i) => `Paso ${i + 1}: ${s}`).join("\n")}

---

RETORNO DE INVERSIÓN ESTIMADO
------------------------------
${cs.roiEstimate}

---

PRÓXIMO PASO
------------
${cs.callToAction}

---

ESPECIFICACIÓN TÉCNICA COMPLETA (Prompt Master)
================================================

${finalPrompt}
`.trim();
}

function buildHtml(
  projectTitle: string,
  contact: Contact,
  cs: CommercialSummary,
  finalPrompt: string
): string {
  const contactRows = contact
    ? `
    <table style="width:100%;border-collapse:collapse;margin:8px 0 20px">
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600;width:120px">Nombre</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.name || "—")}</td></tr>
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600">Email</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.email || "—")}</td></tr>
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600">WhatsApp</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.whatsapp || "—")}</td></tr>
      <tr><td style="padding:6px 10px;background:#eef2ff;font-weight:600">Empresa</td><td style="padding:6px 10px;border:1px solid #e2e8f0">${escapeHtml(contact.company || "—")}</td></tr>
    </table>`
    : "";

  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:640px;margin:0 auto;padding:16px">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:24px;border-radius:16px;text-align:center">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Nuevo lead</div>
    <h1 style="margin:6px 0 0;font-size:22px">${escapeHtml(cs.headline)}</h1>
    <div style="opacity:.85;font-size:14px;margin-top:4px">${escapeHtml(projectTitle)}</div>
  </div>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:24px 0 4px">Datos del prospecto</h2>
  ${contactRows}

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:20px 0 4px">El problema</h2>
  <p>${escapeHtml(cs.problem)}</p>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:20px 0 4px">Beneficios clave</h2>
  <ul>${cs.benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:20px 0 4px">Cómo funciona</h2>
  <ol>${cs.howItWorks.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:20px 0 4px">ROI estimado</h2>
  <p style="background:#ecfdf5;border-radius:10px;padding:12px">${escapeHtml(cs.roiEstimate)}</p>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:20px 0 4px">Próximo paso</h2>
  <p>${escapeHtml(cs.callToAction)}</p>

  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:24px 0 4px">Prompt Master (especificación técnica)</h2>
  <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:12px;white-space:pre-wrap;word-break:break-word;font-size:12px">${escapeHtml(finalPrompt)}</pre>
</body></html>`;
}

/** Envío principal vía Resend (requiere RESEND_API_KEY). */
async function sendViaResend(opts: {
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) return { ok: false, error: "no_key" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [RECIPIENT],
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });

  if (res.ok) return { ok: true };
  const errText = await res.text().catch(() => "");
  console.error("Resend error:", res.status, errText);
  return { ok: false, error: errText || "Resend error", status: 502 };
}

/** Respaldo vía formsubmit (sin necesidad de key). */
async function sendViaFormsubmit(opts: {
  subject: string;
  text: string;
  contact: Contact;
  projectTitle: string;
  origin: string;
  replyTo?: string;
}): Promise<{ ok: boolean; delivered?: boolean; activation?: boolean; error?: string; status?: number }> {
  const formData = new FormData();
  formData.append("name", opts.contact?.name || "Arquitecto de Soluciones");
  formData.append("email", opts.replyTo || "arquitecto@soluciones.app");
  formData.append("_subject", opts.subject);
  formData.append("_template", "table");
  formData.append("Prospecto", opts.contact?.name || "—");
  formData.append("Email", opts.contact?.email || "—");
  formData.append("WhatsApp", opts.contact?.whatsapp || "—");
  formData.append("Empresa", opts.contact?.company || "—");
  formData.append("Proyecto", opts.projectTitle);
  formData.append("Propuesta Comercial y Prompt Master", opts.text);

  const res = await fetch(`https://formsubmit.co/ajax/${RECIPIENT}`, {
    method: "POST",
    headers: { Accept: "application/json", Origin: opts.origin, Referer: `${opts.origin}/` },
    body: formData,
  });

  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  const success = data.success === "true" || data.success === true;
  const message = typeof data.message === "string" ? data.message : "";
  if (success) return { ok: true, delivered: true };
  if (/activat/i.test(message)) return { ok: true, delivered: false, activation: true };
  return { ok: false, error: message || "Error enviando email", status: 502 };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { projectTitle, contact, commercialSummary: cs, finalPrompt } = parsed.data;
  const subjectWho = contact?.name ? ` — ${contact.name}` : "";
  const subject = `Nuevo lead${subjectWho}: ${projectTitle}`;
  const replyTo = contact?.email || undefined;
  const text = buildText(projectTitle, contact, cs, finalPrompt);

  try {
    // 1) Resend (si hay key)
    const resend = await sendViaResend({
      subject,
      text,
      html: buildHtml(projectTitle, contact, cs, finalPrompt),
      replyTo,
    });
    if (resend.ok) return NextResponse.json({ ok: true, delivered: true, via: "resend" });
    if (resend.error && resend.error !== "no_key") {
      return NextResponse.json({ error: "Error enviando email (Resend)" }, { status: 502 });
    }

    // 2) Respaldo: formsubmit
    const origin =
      request.headers.get("origin") ||
      request.nextUrl.origin ||
      "https://arquitecto-soluciones.vercel.app";
    const fs = await sendViaFormsubmit({ subject, text, contact, projectTitle, origin, replyTo });
    if (fs.ok) return NextResponse.json({ ok: true, delivered: fs.delivered, activation: fs.activation, via: "formsubmit" });
    return NextResponse.json({ error: fs.error }, { status: fs.status ?? 502 });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "Error enviando email" }, { status: 502 });
  }
}
