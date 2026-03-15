# Xpense — Inteligencia Financiera Personal

Aplicación web de inteligencia financiera personal que conecta tu Gmail para extraer automáticamente transacciones bancarias, categorizarlas con IA (GPT-4o), detectar fraudes, suscripciones y generar presupuestos inteligentes.

## Stack Técnico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript (strict)
- **Base de datos**: Supabase (Auth, Database, Vault)
- **IA**: OpenAI GPT-4o
- **Email**: Gmail API (OAuth 2.0)
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: Vercel

## Setup Local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env.local

# 3. Configurar las variables en .env.local (ver sección abajo)

# 4. Ejecutar SQL en Supabase
#    Ir a Supabase SQL Editor y ejecutar: supabase/schema.sql

# 5. Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (solo servidor) |
| `OPENAI_API_KEY` | API key de OpenAI |
| `GOOGLE_CLIENT_ID` | Client ID de Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | URI de callback para Gmail OAuth |
| `NEXT_PUBLIC_APP_URL` | URL base de la app |
| `VAULT_ENCRYPTION_KEY` | Clave para Supabase Vault |

## Estructura del Proyecto

```
/app
  /auth/login, /register, /callback    — Autenticación
  /onboarding                           — Onboarding de 3 pasos
  /dashboard                            — Dashboard principal
    /transactions                       — Lista de transacciones
    /cards                              — Gestión de tarjetas
    /budgets                            — Presupuestos por categoría
    /subscriptions                      — Suscripciones detectadas
    /alerts                             — Fraude + sin clasificar
    /chat                               — Chatbot financiero IA
    /settings/accounts                  — Cuentas Gmail conectadas
  /api
    /chat                               — API del chatbot
    /gmail/connect, /callback           — OAuth de Gmail
    /emails/import                      — Importación de correos
    /onboarding/complete                — Finalizar onboarding
    /smart/run                          — Ejecutar análisis inteligente
/actions                                — Server Actions
/components/ui                          — Componentes shadcn/ui
/components/dashboard                   — Componentes del dashboard
/lib/supabase                           — Clientes de Supabase
/lib/openai                             — Cliente y extracción IA
/lib/gmail                              — Cliente Gmail y filtros
/types                                  — Tipos TypeScript
/supabase                               — SQL scripts
```

---

## Checklist de Deploy en Vercel (via GitHub)

### 1. Preparar Supabase
- [ ] Crear proyecto en [supabase.com](https://supabase.com)
- [ ] Ir a SQL Editor y ejecutar `supabase/schema.sql`
- [ ] Habilitar la extensión `supabase_vault` en Database > Extensions
- [ ] En Authentication > Providers, habilitar:
  - Email (ya habilitado por defecto)
  - Google OAuth (configurar Client ID y Secret)
- [ ] En Authentication > URL Configuration:
  - Site URL: `https://tu-dominio.vercel.app`
  - Redirect URLs: `https://tu-dominio.vercel.app/auth/callback`
- [ ] Copiar `Project URL`, `anon key` y `service_role key` de Settings > API

### 2. Configurar Google Cloud Console
- [ ] Crear proyecto en [console.cloud.google.com](https://console.cloud.google.com)
- [ ] Habilitar Gmail API
- [ ] Crear credenciales OAuth 2.0:
  - Tipo: Web Application
  - Authorized redirect URIs:
    - `http://localhost:3000/api/gmail/callback` (desarrollo)
    - `https://tu-dominio.vercel.app/api/gmail/callback` (producción)
- [ ] Configurar pantalla de consentimiento OAuth
- [ ] Copiar Client ID y Client Secret

### 3. Configurar OpenAI
- [ ] Crear API key en [platform.openai.com](https://platform.openai.com)
- [ ] Asegurarse de tener acceso a GPT-4o

### 4. Subir a GitHub
- [ ] `git init` (si no existe)
- [ ] `git add .`
- [ ] `git commit -m "Initial commit: Xpense"`
- [ ] Crear repositorio en GitHub
- [ ] `git remote add origin https://github.com/tu-usuario/xpense.git`
- [ ] `git push -u origin main`

### 5. Deploy en Vercel
- [ ] Ir a [vercel.com](https://vercel.com) > Import Project
- [ ] Seleccionar el repositorio de GitHub
- [ ] Framework Preset: Next.js
- [ ] Agregar todas las variables de entorno (ver `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` = `https://tu-dominio.vercel.app/api/gmail/callback`
  - `NEXT_PUBLIC_APP_URL` = `https://tu-dominio.vercel.app`
  - `VAULT_ENCRYPTION_KEY` (generar con `openssl rand -hex 32`)
- [ ] Deploy

### 6. Post-Deploy
- [ ] Actualizar `GOOGLE_REDIRECT_URI` con el dominio real de Vercel
- [ ] Actualizar Supabase Authentication URLs con el dominio real
- [ ] Actualizar Google Cloud Console redirect URIs
- [ ] Verificar login con email y Google OAuth
- [ ] Verificar conexión de Gmail y procesamiento de correos
