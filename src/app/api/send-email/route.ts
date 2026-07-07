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

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { projectTitle, contact, commercialSummary: cs, finalPrompt } = parsed.data;

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

  const emailBody = `
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

  try {
    const formData = new FormData();
    formData.append("name", contact?.name || "Arquitecto de Soluciones");
    // Si el prospecto dejó email, lo usamos como remitente para poder responderle directo.
    formData.append("email", contact?.email || "arquitecto@soluciones.app");
    const subjectWho = contact?.name ? ` — ${contact.name}` : "";
    formData.append("_subject", `Nuevo lead${subjectWho}: ${projectTitle}`);
    formData.append("_template", "table");
    formData.append("Prospecto", contact?.name || "—");
    formData.append("Email", contact?.email || "—");
    formData.append("WhatsApp", contact?.whatsapp || "—");
    formData.append("Empresa", contact?.company || "—");
    formData.append("Proyecto", projectTitle);
    formData.append("Propuesta Comercial y Prompt Master", emailBody);

    const response = await fetch(`https://formsubmit.co/ajax/${RECIPIENT}`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && (data.success === "true" || data.success === true)) {
      return NextResponse.json({ ok: true });
    }

    // Si es el primer envío, formsubmit envía email de activación al destinatario
    // y responde con un estado especial — igual lo consideramos OK
    return NextResponse.json({ ok: true, note: "activation_pending" });

  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "Error enviando email" }, { status: 502 });
  }
}
