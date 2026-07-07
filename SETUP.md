# Arquitecto de Soluciones — Guía de Configuración

App web (Next.js 16 + React 19 + Tailwind 4) que entrevista a un usuario no
técnico y genera un **Prompt Master** técnico + una **propuesta comercial** que
se envía por email.

- **IA**: Groq (`llama-3.3-70b-versatile`), llamada solo desde el servidor.
- **Persistencia**: `localStorage` en el navegador (sin base de datos, sin login).
- **Email**: formsubmit.co (sin backend de correo propio).

## Paso 1: API key de Groq (GRATIS)

1. Entra a [console.groq.com/keys](https://console.groq.com/keys) y crea una API key.
2. La key empieza con `gsk_...`.

## Paso 2: Variable de entorno

Edita `.env.local` y pega tu key:

```
GROQ_API_KEY=gsk_tu_key_real_aqui
```

## Paso 3: Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Paso 4: Despliegue en Vercel

1. Sube el proyecto a un repo de GitHub.
2. Conecta el repo en [vercel.com](https://vercel.com).
3. En **Vercel > Settings > Environment Variables** agrega `GROQ_API_KEY` con el
   mismo valor. Redespliega.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts               ← Entrevista (Groq, solo servidor)
│   │   ├── commercial-summary/route.ts ← Genera la propuesta comercial (Groq)
│   │   └── send-email/route.ts         ← Envía la propuesta por email (formsubmit.co)
│   ├── dashboard/page.tsx              ← Lista de proyectos (localStorage)
│   ├── session/[id]/page.tsx           ← Chat de entrevista + propuesta
│   └── page.tsx                        ← Landing
├── components/
│   ├── ChatMessage.tsx
│   ├── PhaseIndicator.tsx
│   └── CommercialSummary.tsx
└── lib/
    ├── groq.ts                         ← Cliente centralizado de Groq
    ├── storage.ts                      ← Persistencia en localStorage
    └── types.ts                        ← Tipos + system prompt del Arquitecto
```

## Nota sobre el email

`send-email/route.ts` usa formsubmit.co apuntando a `nathaliaaguillon@gmail.com`.
La **primera vez** formsubmit envía un correo de activación a esa dirección: hay
que confirmarlo una sola vez para que los envíos posteriores lleguen directo.
