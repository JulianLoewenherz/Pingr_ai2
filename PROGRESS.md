## Progress log

This file captures what’s been set up so far for Pingr MVP (as of the latest session).

### Repo structure decisions
- **Monorepo-style layout**
  - Repo root: `Pingr_ai2/`
  - Next.js app lives in: `Pingr_ai2/pingr/`
  - Planning docs live at repo root:
    - `ideaoutline.md`
    - `Implementationplan.md`

### Supabase
- **Supabase project created** (dev environment).
- Identified that we will use:
  - **Supabase Auth** (email/password first)
  - **Postgres** with **RLS** (Row Level Security)
  - **Data API** enabled (recommended)
  - Automatic RLS for new tables is recommended (if enabled, new tables default to RLS-on)
- Next planned Supabase tasks (not done yet in DB):
  - Create MVP tables: `user_profiles`, `prospects`, `drafts`
  - Enable RLS and add policies to restrict rows to `auth.uid()`

### Next.js app scaffold (`Pingr_ai2/pingr/`)
- Created a Next.js app using `create-next-app` with:
  - TypeScript
  - App Router (`--app`)
  - Tailwind CSS
  - ESLint
  - Code inside a `src/` directory
- Verified local dev server works and the app loads at `http://localhost:3000`.

### Environment variables
- Added Supabase public connection variables in:
  - `Pingr_ai2/pingr/.env.local`
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Note: `SUPABASE_SERVICE_ROLE_KEY` will be added later for server-only endpoints (never exposed to client).

### Supabase client wiring
- Installed Supabase JS client in the Next.js app:
  - Dependency present: `@supabase/supabase-js` (see `pingr/package.json`)
- Created Supabase client helper:
  - `Pingr_ai2/pingr/src/lib/supabaseClient.ts`
  - Exports a `supabase` client created from the two `NEXT_PUBLIC_...` env vars.

### What’s next (high-level)
- Build `/login` (sign up + sign in)
- Create tables + RLS policies in Supabase
- Build `/onboarding` to save `user_profiles`
- Add basic route gating (logged out → `/login`, no profile → `/onboarding`)
- Then: `POST /api/generate` + extension side panel

