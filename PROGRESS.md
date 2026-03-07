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

**`user_profiles` table (created via Supabase UI):**
- `user_id uuid` — primary key, FK to `auth.users(id)` ON DELETE CASCADE (no default; always set to the authenticated user's ID)
- `background text` — nullable
- `goals text` — nullable
- `tone text` — nullable
- `roles text[]` — nullable
- `industries text[]` — nullable
- `emphasis text` — nullable
- `created_at timestamptz` — not null, default `now()`
- `updated_at timestamptz` — nullable, set to `now()` on every upsert in application code
- **RLS enabled** with policy: `Users manage own profile` — `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`

**`prospects` table (created and working):**
- `id uuid` — primary key, default `gen_random_uuid()`
- `user_id uuid` — not null, FK to `auth.users(id)` ON DELETE CASCADE
- `linkedin_url text` — not null
- `display_name text` — nullable
- `headline text` — nullable
- `company text` — nullable
- `location text` — nullable
- `apify_raw jsonb` — nullable (full Apify response stored here)
- `status text` — nullable (e.g. `marked_sent`)
- `status_updated_at timestamptz` — nullable
- `created_at timestamptz` — not null, default `now()`
- `updated_at timestamptz` — nullable
- Unique constraint on `(user_id, linkedin_url)` — one prospect per user per URL
- **RLS enabled** with policy: `Users manage own prospects` — `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`

**`drafts` table (created and working):**
- `id uuid` — primary key, default `gen_random_uuid()`
- `user_id uuid` — not null, FK to `auth.users(id)` ON DELETE CASCADE
- `prospect_id uuid` — not null, FK to `prospects(id)` ON DELETE CASCADE
- `draft_text text` — not null
- `personalization_note text` — nullable
- `created_at timestamptz` — not null, default `now()`
- **RLS enabled** with policy: `Users manage own drafts` — `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`

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
- Can be deleted when `/app/prospects` is fully built out

**Tested and confirmed working:**
- Google OAuth login → profile check → lands on `/onboarding` or `/app/prospects`
- Email/password login → profile check → lands on `/onboarding` or `/app/prospects`
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

### Onboarding + routing (complete and tested)

**Post-login routing logic:**
- After email login: queries `user_profiles` client-side immediately after `signInWithPassword` succeeds; redirects to `/app/prospects` if a profile row exists, `/onboarding` if not.
- After Google OAuth: `auth/oauth/route.ts` queries `user_profiles` server-side after `exchangeCodeForSession`; same redirect logic.

**`/onboarding` page** (`src/app/onboarding/page.tsx`):
- Server Component — reads the current user from `getClaims()`, then queries `user_profiles` with `.maybeSingle()`
- If no profile found: renders empty `OnboardingForm`
- If profile found: renders `OnboardingForm` prefilled (user can update their profile at any time by revisiting `/onboarding`)

**`OnboardingForm` component** (`src/components/onboarding-form.tsx`):
- Client Component (`'use client'`)
- Fields: background, goals, tone, roles (comma-separated → `text[]`), industries (comma-separated → `text[]`), emphasis
- On submit calls the `upsertProfile` server action

**`upsertProfile` server action** (`src/app/onboarding/actions.ts`):
- Runs server-side; reads `user_id` from session claims (never from the form body — prevents spoofing)
- Issues a Supabase `.upsert()` with `onConflict: 'user_id'`: inserts on first save, updates in place on subsequent saves
- Returns `{ error: string | null }` — form displays any error inline

**`/app/prospects` page** (`src/app/app/prospects/page.tsx`):
- Server Component — real prospects dashboard, live data from Supabase
- Secondary gate: if user somehow lands here with no profile row → redirect to `/onboarding`
- Top nav: "Pingr" brand, "Edit profile" link, Logout button
- Fetches all `prospects` rows for the current user, ordered most recent first
- Each row shows: name (falls back to LinkedIn URL), headline · company subtitle, status badge, created date
- Status badge is color-coded; currently `marked_sent` → green "Sent" label (easy to extend)
- Empty state: dashed border placeholder with extension install prompt
- Prospect count shown in subtitle below page heading

**Tested and confirmed working:**
- New user signs up → logs in → no profile row → `/onboarding` → fills form → `/app/prospects`
- Returning user logs in → profile row exists → `/app/prospects` directly
- Revisiting `/onboarding` while logged in with a profile → form is prefilled for editing

---

### Home page (complete and tested)

**`/` route** (`src/app/page.tsx`):
- Server Component — reads session via `getClaims()`
- Unauthenticated: "Pingr" heading + "Log in" and "Create account" buttons → `/auth/login`, `/auth/sign-up`
- Authenticated: "Signed in as {email}" + "Go to Dashboard" button → `/app/prospects`

**Middleware** (`src/lib/supabase/middleware.ts`):
- `/` added to public paths — unauthenticated users can access home and `/auth/*` only
- All other routes require authentication

---

### What's next (high-level)

1. ~~Create `prospects` and `drafts` tables in Supabase with RLS policies~~ ✓ Done
2. ~~Build out the real `/app/prospects` dashboard (list view, statuses)~~ ✓ Done
3. Build `POST /api/generate` endpoint (Apify enrichment + LLM draft generation)
4. Build Chrome extension (WXT + React side panel)
5. Add status update endpoint + wire extension buttons to it
