## Progress log

This file captures what's been set up so far for Pingr MVP (as of the latest session).

### Repo structure decisions
- **Monorepo-style layout**
  - Repo root: `Pingr_ai2/`
  - Next.js app lives in: `Pingr_ai2/pingr/`
  - Planning docs live at repo root:
    - `ideaoutline.md`
    - `Implementationplan.md`

---

### Supabase

- **Supabase project created** (dev environment).
- **Auth providers enabled:**
  - Email/password (email confirmation disabled for local dev)
  - Google OAuth (Client ID + Client Secret configured)
- **Auth URL Configuration set:**
  - Site URL: `http://localhost:3000`
  - Redirect URLs include: `http://localhost:3000/auth/oauth`
- **Google OAuth wired via Google Cloud Console:**
  - OAuth consent screen configured
  - Web application credentials created
  - Authorized redirect URI: `https://pfwjifwfvimgdfehsrjq.supabase.co/auth/v1/callback`
- Next planned Supabase tasks (not done yet):
  - Create MVP tables: `user_profiles`, `prospects`, `drafts`
  - Enable RLS and add policies to restrict rows to `auth.uid()`

---

### Next.js app scaffold (`Pingr_ai2/pingr/`)

- Created with `create-next-app`:
  - TypeScript, App Router, Tailwind CSS v4, ESLint, `src/` directory
- **shadcn/ui initialized** (Radix library, Nova preset, Tailwind v4 compatible)
- **Supabase Auth blocks installed** via single shadcn commands:
  - `@supabase/password-based-auth-nextjs`
  - `@supabase/social-auth-nextjs`

---

### Environment variables

File: `Pingr_ai2/pingr/.env.local`
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — legacy anon key (kept for reference)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — new publishable key (used by all Supabase clients)

Note: `SUPABASE_SERVICE_ROLE_KEY` will be added later for server-only API endpoints.

---

### Auth implementation (complete and tested)

**Architecture:** Cookie-based auth via `@supabase/ssr` — sessions are readable server-side, enabling proper route protection and authenticated API routes.

**Supabase client helpers** (`src/lib/supabase/`):
- `client.ts` — browser client (used in `'use client'` components)
- `server.ts` — server client (used in Server Components and API routes)
- `middleware.ts` — session refresh utility (used by the proxy)

**Proxy / route protection** (`src/proxy.ts`):
- Next.js 16 proxy (replaces the old `middleware.ts` convention)
- Automatically refreshes Supabase session cookies on every request
- Redirects unauthenticated users to `/auth/login`

**Auth pages installed and working:**
- `/auth/login` — login form (email/password + Google OAuth button)
- `/auth/sign-up` — sign-up form
- `/auth/sign-up-success` — post-signup confirmation page
- `/auth/forgot-password` — forgot password form
- `/auth/update-password` — update password form
- `/auth/confirm` — email OTP confirmation route handler
- `/auth/oauth` — Google OAuth callback route handler
- `/auth/error` — auth error page

**Components installed:**
- `src/components/login-form.tsx` — custom combined email+Google login form
- `src/components/sign-up-form.tsx`
- `src/components/forgot-password-form.tsx`
- `src/components/update-password-form.tsx`
- `src/components/logout-button.tsx`
- `src/components/ui/` — shadcn Button, Card, Input, Label

**Protected page (test stub):**
- `/protected` — shows logged-in user's email + Logout button
- Used to verify end-to-end auth flow works
- Will be replaced by the real app dashboard later

**Tested and confirmed working:**
- Google OAuth login → lands on `/protected`
- Email/password login → lands on `/protected`
- Logout button → signs out and redirects to `/auth/login`
- Unauthenticated access to any route → redirected to `/auth/login`

**Legacy file to clean up later:**
- `src/lib/supabaseClient.ts` — original simple client, no longer used; safe to delete when convenient

---

### Key dependencies added

- `@supabase/ssr` — cookie-based Supabase client for App Router
- `@supabase/supabase-js` — Supabase JS client
- `shadcn` — component CLI
- `radix-ui` — headless UI primitives (used by shadcn)
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn utilities
- `lucide-react` — icons

---

### What's next (high-level)

1. Build a proper home page (`/`) with a "Log in" button (currently just the default Next.js scaffold)
2. Create MVP tables in Supabase: `user_profiles`, `prospects`, `drafts`
3. Enable RLS and add per-user policies on all three tables
4. Build `/onboarding` to collect and save `user_profiles`
5. Add route gating: logged in but no profile → `/onboarding`; no session → `/auth/login`
6. Build `/app/prospects` dashboard (empty state first)
7. Then: `POST /api/generate` endpoint + Chrome extension
