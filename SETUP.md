# Arquitecto de Soluciones — Guía de Configuración

## Paso 1: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto gratuito.
2. En el panel de Supabase ve a **SQL Editor** y ejecuta el contenido de `supabase-schema.sql`.
3. En **Authentication > URL Configuration**, agrega `http://localhost:3000/auth/callback` como URL de redirección.
4. Copia las credenciales desde **Settings > API**:
   - `Project URL`
   - `anon public key`

## Paso 2: Configurar Anthropic

1. Ve a [console.anthropic.com](https://console.anthropic.com) y crea una API Key.

## Paso 3: Variables de entorno

Edita el archivo `.env.local` con tus credenciales reales:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-...
```

## Paso 4: Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Paso 5: Despliegue en Vercel

1. Sube el proyecto a un repo de GitHub.
2. Conecta el repo en [vercel.com](https://vercel.com).
3. Agrega las mismas variables de entorno en Vercel > Settings > Environment Variables.
4. En Supabase agrega la URL de producción en Authentication > URL Configuration.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          ← Llama a Anthropic (SOLO servidor)
│   │   └── sessions/
│   │       ├── route.ts           ← CRUD de sesiones
│   │       └── [id]/route.ts      ← Detalle de sesión
│   ├── auth/
│   │   ├── login/page.tsx         ← Página de login (magic link)
│   │   └── callback/route.ts      ← Callback de Supabase Auth
│   ├── dashboard/page.tsx         ← Lista de proyectos
│   ├── session/[id]/page.tsx      ← Chat de entrevista
│   └── page.tsx                   ← Landing page
├── components/
│   ├── ChatMessage.tsx            ← Renderiza un mensaje del chat
│   ├── PhaseIndicator.tsx         ← Indicador de fase (1/2/3)
│   └── DownloadButton.tsx         ← Botón descarga .md
├── lib/
│   ├── types.ts                   ← Tipos TypeScript + system prompt
│   └── supabase/
│       ├── client.ts              ← Cliente para el browser
│       ├── server.ts              ← Cliente para el servidor
│       └── middleware.ts          ← Helper para proxy/auth
└── proxy.ts                       ← Protección de rutas (auth)
```
