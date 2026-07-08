# Arquitecto de Soluciones — Guía de Configuración

App web (Next.js 16 + React 19 + Tailwind 4) que entrevista a un usuario no
técnico y genera un **Prompt Master** técnico + una **propuesta comercial**.

- **IA (Groq)**: la entrevista corre con `llama-3.1-8b-instant` (rápido, presupuesto
  diario grande) y el **Prompt Master final** con `llama-3.3-70b-versatile` (más
  potente). Se llama solo desde el servidor.
- **Persistencia**: `localStorage` en el navegador (sin base de datos, sin login).
- **Idiomas**: toggle **ES / EN** en la cabecera (interfaz, entrevista y correos).
- **Email (Resend)**: al completar la entrevista se envía a la dueña la propuesta
  comercial en el cuerpo **+ el Prompt Master como adjunto `.md`** (el texto del
  prompt NO va en el cuerpo). Opcionalmente se envía al lead una copia de la
  propuesta (sin adjunto, sin nada técnico) — requiere dominio verificado.

## Paso 1: API key de Groq (GRATIS)

1. Entra a [console.groq.com/keys](https://console.groq.com/keys) y crea una API key (`gsk_...`).

## Paso 2: Cuenta de Resend para el correo (GRATIS)

El envío usa [Resend](https://resend.com) (único proveedor gratis que soporta
adjuntos y enviar al email del lead).

1. Crea una cuenta en [resend.com](https://resend.com) **con el correo
   `nathaliaaguillon@gmail.com`** (importante: Resend en modo prueba solo entrega
   a la dirección dueña de la cuenta).
2. Crea una API key en [resend.com/api-keys](https://resend.com/api-keys) (`re_...`).
3. Con esto ya funciona el **correo a la dueña con el adjunto .md**. No hace falta dominio.

### (Opcional) Enviar también al correo del lead

Para escribirle al prospecto a su propio email hace falta **verificar un dominio**
en Resend ([resend.com/domains](https://resend.com/domains) → añadir registros DNS).
Una vez verificado, define `RESEND_LEAD_FROM` (abajo). Sin esto, el correo al lead
queda desactivado y solo se envía el correo a la dueña.

## Paso 3: Variables de entorno

Edita `.env.local` (y en Vercel, **Settings > Environment Variables**):

```
GROQ_API_KEY=gsk_tu_key_real_aqui
RESEND_API_KEY=re_tu_key_real_aqui

# Calidad de la IA. "balanced" (por defecto) = entrevista con 8b y Prompt Master
# con 70b (plan gratis). "max" = 70b en todo (mejor calidad, requiere Groq Dev
# Tier de pago porque en plan gratis agota el límite diario del 70b).
AI_QUALITY_MODE=balanced

# Opcional. Remitente para el correo a la dueña (por defecto onboarding@resend.dev).
# Cámbialo solo si verificaste un dominio.
# RESEND_FROM=Arquitecto de Soluciones <no-reply@tudominio.com>

# Opcional. Activa el correo AL LEAD. Requiere dominio verificado en Resend.
# Si está vacío, no se envía correo al lead.
# RESEND_LEAD_FROM=Propuestas <propuestas@tudominio.com>
```

## Paso 4: Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Paso 5: Despliegue en Vercel

1. Sube el proyecto a GitHub (rama `main`; commit dispara el deploy).
2. Conecta el repo en [vercel.com](https://vercel.com).
3. Agrega `GROQ_API_KEY` y `RESEND_API_KEY` (y opcionalmente `RESEND_FROM` /
   `RESEND_LEAD_FROM`) en las variables de entorno y redespliega.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts               ← Entrevista (Groq 8b/70b según fase + idioma)
│   │   ├── commercial-summary/route.ts ← Propuesta comercial (Groq 8b)
│   │   └── send-email/route.ts         ← Correo dueña (propuesta + adjunto .md) y lead (Resend)
│   ├── dashboard/page.tsx              ← Lista de proyectos (localStorage)
│   ├── session/[id]/page.tsx           ← Chat de entrevista + propuesta
│   ├── layout.tsx                      ← Monta el LangProvider (ES/EN)
│   └── page.tsx                        ← Landing
├── components/
│   ├── LangProvider.tsx / LangToggle.tsx ← Selector de idioma (persistido)
│   ├── ChatMessage.tsx · PhaseIndicator.tsx
│   ├── CommercialSummary.tsx · PromptMasterCard.tsx · ContactForm.tsx
└── lib/
    ├── groq.ts                         ← Cliente Groq (modelos, reintentos, errores por idioma)
    ├── i18n.ts                         ← Diccionario ES/EN
    ├── storage.ts                      ← Persistencia en localStorage
    └── types.ts                        ← Tipos + system prompt del Arquitecto
```

## Notas

- **Límites de Groq (plan gratis, POR MODELO)**: el 70b tiene 100k tokens/día; por eso
  la entrevista usa el 8b (500k/día) y el 70b queda para el Prompt Master.
- **Correo a la dueña**: `nathaliaaguillon@gmail.com` (constante `OWNER_EMAIL` en `types.ts`).
- Si `RESEND_API_KEY` no está configurada, la app no envía correos (mostrará el estado
  como pendiente); todo lo demás funciona.
