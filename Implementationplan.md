## Implementation plan (technical, MVP)

This plan turns `ideaoutline.md` into a buildable MVP with **LinkedIn message drafts only** (no “email found” flow).

### Stack (recommended for easiest MVP)
- **Web app + backend**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Auth + DB**: Supabase (Auth + Postgres + Row Level Security)
- **Extension**: WXT (MV3) + React (side panel)
- **External services**: Apify (LinkedIn profile enrichment), LLM provider (OpenAI or equivalent)

### Milestone 0 — Repo + local dev baseline
- **Goal**: one repo that can run web app locally; extension can call backend locally.
- **Actionable steps**
  - Create a Next.js app (TypeScript, App Router).
  - Add Tailwind + shadcn/ui and pick a simple layout:
    - `/login`
    - `/onboarding` (profile form)
    - `/app/prospects` (dashboard list)
  - Add a server-only environment setup for keys:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY` (server only, never exposed to client)
    - `APIFY_TOKEN`
    - `LLM_API_KEY`

### Milestone 1 — Supabase project setup (Auth + database)
- **Goal**: users can sign up/login; database is ready with per-user ownership enforced by RLS.

#### 1. Create Supabase project
- Create a Supabase project for dev.
- In Supabase dashboard:
  - **Auth → Providers**: enable **Email** (email+password). (Google can be added later.)
  - **Auth → URL Configuration**: set redirect URLs for local dev and prod (when available).

#### 2. Create tables (SQL Editor)
Create these tables in Supabase (names are suggestions; keep them stable once you ship).

This is the **simplified MVP schema (Option A)**:
- Only **3 tables** (+ Supabase Auth): `user_profiles`, `prospects`, `drafts`
- Track outreach via a **single current status on `prospects`** (no event log table in MVP)

- **`user_profiles`**
  - `user_id uuid primary key references auth.users(id) on delete cascade`
  - `background text` (short “about me” used for personalization)
  - `goals text` (recruiting goals / why you’re reaching out)
  - `tone text` (e.g. friendly, direct, formal)
  - `roles text[]` (optional but useful)
  - `industries text[]` (optional but useful)
  - `emphasis text` (optional: details to emphasize)
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`

- **`prospects`**
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `linkedin_url text not null`
  - `display_name text`
  - `headline text`
  - `company text`
  - `location text`
  - `apify_raw jsonb` (store full normalized/enriched payload)
  - `status text` (current status)
    - Suggested MVP set: `draft_generated`, `copied`, `marked_sent`, `replied`, `skipped`, `follow_up_needed`
  - `status_updated_at timestamptz`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
  - Unique constraint: `(user_id, linkedin_url)` to prevent duplicates per user.

- **`drafts`**
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `prospect_id uuid not null references prospects(id) on delete cascade`
  - `draft_text text not null`
  - `personalization_note text` (optional)
  - `created_at timestamptz default now()`

#### 3. Enable Row Level Security + policies
- Enable RLS on: `user_profiles`, `prospects`, `drafts`.
- Create policies so users can only access their own data.
  - **Pattern**
    - Select: `user_id = auth.uid()`
    - Insert: `user_id = auth.uid()` (or `user_id` is set automatically in server code)
    - Update/Delete: `user_id = auth.uid()`
  - For `user_profiles`, use `user_id = auth.uid()` and enforce 1 profile per user.

#### 4. Verify with Supabase Table Editor
- Sign up a test user.
- Confirm:
  - user can insert/read their own `user_profiles` row
  - user cannot access other users’ data (RLS works)

### Milestone 2 — Web app: Auth + onboarding + dashboard
- **Goal**: user can create account, fill profile, see an empty prospects dashboard.

#### 1. Auth pages
- Implement `/login` for sign up + sign in (email/password).
- Persist session on refresh.

#### 2. Profile onboarding
- Implement `/onboarding`:
  - load existing `user_profiles` for current user (if any)
  - upsert profile on submit
  - redirect to `/app/prospects`

#### 3. Prospects dashboard
- Implement `/app/prospects`:
  - list `prospects` for the user (most recent first)
  - show current status from `prospects.status` + `prospects.status_updated_at`
  - show latest draft snippet (optional)

### Milestone 3 — Backend API: “generate draft” endpoint
- **Goal**: a single authenticated endpoint that takes a LinkedIn URL and returns a generated LinkedIn message draft, storing everything.

#### API contract
- `POST /api/generate`
  - **Auth**: required (session-based via Supabase)
  - **Body**: `{ "linkedinUrl": "https://www.linkedin.com/in/..." }`
  - **Response**:
    - `prospect` (id + summary fields)
    - `draft` (draft_text + optional note)

#### Server-side pipeline (inside the endpoint)
- Validate URL shape (LinkedIn profile URL).
- Load the current user’s `user_profiles` (must exist).
- Call Apify actor with the LinkedIn URL.
- Normalize Apify output into:
  - `prospects` upsert by `(user_id, linkedin_url)`
  - summary fields (`display_name`/headline/company/location)
  - `apify_raw` jsonb for full payload
- Call LLM with:
  - user profile context
  - normalized prospect context
  - output requirements: short coffee chat LinkedIn message + optional personalization note
- Insert into `drafts`.
- Update `prospects.status='draft_generated'` and set `status_updated_at=now()`.
- Return the generated content.

#### Operational safeguards (MVP-friendly)
- Add a simple per-user rate limit (e.g. max N generations/minute).
- Ensure Apify + LLM secrets are never exposed to the browser/extension.
- Add basic error responses:
  - missing profile → 400 with “complete onboarding”
  - Apify failure → 502
  - LLM failure → 502

### Milestone 4 — Extension: LinkedIn side panel that calls your API
- **Goal**: while viewing a LinkedIn profile, user opens the side panel and clicks “Generate” to get a draft.

#### 1. Scaffold extension
- Use WXT (MV3) with:
  - a **side panel** UI built with React
  - a content script that detects current profile URL reliably (handles SPA navigation)

#### 2. Auth in extension (simplest)
- In the side panel, embed the same Supabase email/password login UI.
- Store Supabase session in extension storage (or rely on Supabase client persistence).

#### 3. Generate flow
- Determine current `linkedinUrl`.
- Call `POST /api/generate` with the URL (user must be logged in).
- Render:
  - recipient summary (`display_name`/headline/company)
  - LinkedIn message draft
  - buttons: Copy, Regenerate
- On Copy:
  - call `POST /api/prospects/status` (or similar) to set `prospects.status='copied'` and `status_updated_at=now()`.

### Milestone 5 — Logging + statuses (web + extension)
- **Goal**: dashboard reflects the outreach state from extension actions.

#### 1. Status model
- Use `prospects.status` + `prospects.status_updated_at` as the source of truth (MVP).

#### 2. Mark sent / replied (manual)
- In extension side panel:
  - button “Marked sent”
  - button “Replied”
  - button “Follow-up needed”
- Each button calls the same status update endpoint to set `prospects.status` accordingly.

#### 3. Dashboard
- For each prospect, show:
  - current status
  - last generated draft timestamp
  - quick filter by status

### Milestone 6 — Polish + production basics (only after end-to-end works)
- Add Google OAuth (optional)
- Add better prospect deduping + search
- Improve prompt + templates and allow user tone presets
- Add retry/backoff for Apify + LLM calls
- Add monitoring/logging for generation failures

### Definition of Done (MVP)
- User can sign up, fill profile, and stay logged in.
- On a LinkedIn profile page, the extension side panel can generate a **LinkedIn** coffee chat message.
- The system stores:
  - user profile
  - prospect record per user per URL
  - generated draft
- The system tracks:
  - current outreach status per prospect (`prospects.status`)
- The web dashboard shows prospects and their current status.

