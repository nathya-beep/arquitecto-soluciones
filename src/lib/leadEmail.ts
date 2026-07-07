"use client";

import { Contact, CommercialSummary } from "./types";

// Web3Forms (plan gratis) bloquea IPs de servidor/datacenter, así que el email
// se envía desde el NAVEGADOR del usuario. La access key de Web3Forms está
// pensada para usarse en el cliente (es pública por diseño).
const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "";

export function buildLeadText(
  projectTitle: string,
  contact: Contact | null,
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

/**
 * Envía el lead por email vía Web3Forms desde el navegador.
 * Devuelve true si Web3Forms confirmó el envío.
 */
export async function sendLeadEmail(params: {
  projectTitle: string;
  contact: Contact | null;
  commercialSummary: CommercialSummary;
  finalPrompt: string;
}): Promise<boolean> {
  if (!WEB3FORMS_KEY) {
    console.error("Falta NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY");
    return false;
  }

  const { projectTitle, contact, commercialSummary: cs, finalPrompt } = params;
  const text = buildLeadText(projectTitle, contact, cs, finalPrompt);
  const subjectWho = contact?.name ? ` — ${contact.name}` : "";

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `Nuevo lead${subjectWho}: ${projectTitle}`,
        from_name: "Arquitecto de Soluciones",
        ...(contact?.email ? { replyto: contact.email } : {}),
        Prospecto: contact?.name || "—",
        Email: contact?.email || "—",
        WhatsApp: contact?.whatsapp || "—",
        Empresa: contact?.company || "—",
        Proyecto: projectTitle,
        "Propuesta Comercial y Prompt Master": text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success === true;
  } catch (err) {
    console.error("Web3Forms client error:", err);
    return false;
  }
}
