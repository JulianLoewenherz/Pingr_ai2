# Pingr

Pingr is an AI-powered LinkedIn outreach assistant for students, job seekers, and networkers who want to write better coffee-chat messages faster. It combines a Next.js web app, a Chrome side-panel extension, Supabase auth/data storage, Apify LinkedIn profile scraping, and OpenAI draft generation into one end-to-end outreach workflow.

Instead of copying a LinkedIn profile into a separate prompt and manually tracking who you contacted, Pingr lets a user browse LinkedIn normally, generate a personalized message in context, copy it into LinkedIn, and keep the prospect plus outreach status in a dashboard.

## Why this project exists

Cold outreach usually has three repetitive steps:

1. Read a profile and find a personal hook.
2. Write a concise message that does not sound generic.
3. Track whether the person was drafted, contacted, followed up with, or replied.

Pingr automates the research and first-draft step while keeping the user in control of the final send. The product is intentionally designed as a lightweight assistant, not a spam bot: it generates short drafts, explains the personalization angle, and asks the user to copy/send manually.

## Demo workflow

1. A user creates an account in the web app.
2. The user fills out an outreach profile with their background, goals, target roles/industries, preferred tone, and points to emphasize.
3. Optionally, the user pastes their own LinkedIn URL and Pingr auto-fills the profile by scraping it and extracting structured context with an LLM.
4. The user opens a LinkedIn profile in Chrome.
5. The Pingr extension side panel detects the current `linkedin.com/in/...` page.
6. The user clicks **Generate message**.
7. The backend scrapes the prospect profile with Apify, saves/updates the prospect in Supabase, and asks OpenAI to write a concise LinkedIn coffee-chat draft using both the user profile and prospect profile.
8. The extension shows the prospect summary, editable generated message, character count, and personalization note.
9. The user copies the message or marks it as sent.
10. The web dashboard stores the prospect, all generated drafts, and the current outreach status.

## What is in this repository

```text
Pingr_ai2/
├── README.md                         # Project overview and setup guide
├── ideaoutline.md                    # Original product outline
├── Implementationplan.md             # MVP implementation plan
├── PROGRESS.md                       # Development progress notes
├── pingr/                            # Next.js web app and backend API
│   ├── src/app/                      # App Router pages and API routes
│   ├── src/components/               # Auth, onboarding, dashboard, and UI components
│   ├── src/lib/                      # Supabase, Apify, OpenAI, and utility code
│   └── public/                       # Static assets and extension zip
└── extension/                        # WXT + React Chrome extension
    ├── entrypoints/                  # Background, content, and side-panel entrypoints
    ├── lib/                          # Extension Supabase client and API wrapper
    └── wxt.config.ts                 # Manifest, permissions, and host config
```

## Main features

### Web app

- Email/password and Google OAuth authentication through Supabase.
- Protected routes using Supabase SSR session cookies.
- User onboarding profile with background, goals, tone, target roles, industries, and emphasis fields.
- LinkedIn-based profile auto-fill for the user's own profile.
- Prospect dashboard showing saved prospects, generated drafts, and outreach status badges.
- Manual LinkedIn URL draft generation from the dashboard for testing or non-extension use.

### Backend API

- `POST /api/generate`
  - Authenticates either a Supabase cookie session from the web app or a Bearer token from the extension.
  - Validates and canonicalizes LinkedIn profile URLs.
  - Enforces a 10-generation-per-day user limit.
  - Scrapes LinkedIn profile data through the Apify `harvestapi/linkedin-profile-scraper` actor.
  - Normalizes prospect summary fields and stores raw profile JSON.
  - Generates a short, personalized LinkedIn coffee-chat message with OpenAI.
  - Saves every generated draft to Supabase.

- `POST /api/prospects/status`
  - Updates prospect status for the authenticated user.
  - Supports `draft_generated`, `copied`, `marked_sent`, `replied`, `skipped`, and `follow_up_needed`.

- `POST /api/autofill-profile`
  - Scrapes the user's own LinkedIn profile.
  - Uses OpenAI to extract structured onboarding context.
  - Saves the raw LinkedIn payload and returns editable fields for the onboarding form.

### Chrome extension

- Built with WXT, React, TypeScript, and Manifest V3.
- Opens as a Chrome side panel.
- Uses Supabase email/password login and persists the session in `chrome.storage.local`.
- Detects whether the active tab is a LinkedIn profile page.
- Calls the same backend API as the web app using the user's Supabase access token.
- Shows editable generated messages, personalization notes, copy/regenerate actions, and a mark-sent action.

## Architecture

```text
LinkedIn profile page
        │
        ▼
Chrome extension side panel
        │  Bearer token + LinkedIn URL
        ▼
Next.js API routes
        │
        ├── Supabase Auth / RLS for user-scoped access
        ├── Apify for LinkedIn profile enrichment
        ├── OpenAI for profile extraction and message generation
        └── Supabase Postgres for profiles, prospects, drafts, and statuses
        │
        ▼
Next.js dashboard
```

The key design choice is that secrets stay on the server. The browser extension never receives the Apify token or OpenAI key; it only sends authenticated requests to the backend.

## Tech stack

| Area | Technology |
| --- | --- |
| Web app | Next.js 16, React 19, TypeScript, App Router |
| Styling/UI | Tailwind CSS 4, shadcn-style components, Radix UI primitives |
| Auth/database | Supabase Auth, Supabase Postgres, Row Level Security |
| AI | OpenAI chat completions |
| LinkedIn enrichment | Apify LinkedIn profile scraper |
| Extension | WXT, React, TypeScript, Chrome Manifest V3 side panel |
| Package manager | npm |

## Data model

The code expects these Supabase tables conceptually:

- `user_profiles`
  - One row per user.
  - Stores onboarding context, optional user's LinkedIn URL, raw scraped LinkedIn JSON, and scrape timestamp.

- `prospects`
  - One row per user/prospect LinkedIn URL.
  - Stores canonical LinkedIn URL, display name, headline, company, location, raw Apify JSON, current status, and timestamps.

- `drafts`
  - Stores every generated message for a prospect.
  - Includes draft text, personalization note, user ID, prospect ID, and created timestamp.

The API is written so Supabase Row Level Security can enforce `auth.uid() = user_id` for all user-owned rows.

## Local setup

### Prerequisites

- Node.js and npm
- A Supabase project
- An OpenAI API key
- An Apify API token with access to the LinkedIn profile scraper actor
- Chrome or a Chromium browser for loading the extension

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd Pingr_ai2

cd pingr
npm install

cd ../extension
npm install
```

### 2. Configure the web app environment

Create `pingr/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-or-anon-key"
OPENAI_API_KEY="your-openai-api-key"
APIFY_TOKEN="your-apify-token"
```

### 3. Configure the extension environment

Create `extension/.env`:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-publishable-or-anon-key"
VITE_API_BASE_URL="http://localhost:3000"
```

For production, set `VITE_API_BASE_URL` to the deployed web app URL and add that URL to the extension `host_permissions` in `extension/wxt.config.ts`.

### 4. Configure Supabase Auth

In Supabase:

- Enable email/password auth.
- Optionally enable Google OAuth for the web app.
- Set local development site URL to `http://localhost:3000`.
- Add `http://localhost:3000/auth/oauth` as an OAuth redirect URL if using Google OAuth.
- Add RLS policies so users can only read/write rows where `auth.uid() = user_id`.

### 5. Run the web app

```bash
cd pingr
npm run dev
```

Open `http://localhost:3000`.

### 6. Run and load the extension

```bash
cd extension
npm run dev
```

Then in Chrome:

1. Go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the generated extension output directory from WXT, usually `extension/.output/chrome-mv3`.
5. Open a LinkedIn profile page and click the Pingr extension icon to open the side panel.

## Useful commands

### Web app

```bash
cd pingr
npm run dev      # Start local Next.js app
npm run build    # Build production app
npm run lint     # Run ESLint
```

### Extension

```bash
cd extension
npm run dev        # Start WXT dev build
npm run build      # Build Chrome extension
npm run compile    # Type-check extension
npm run zip        # Package extension zip
```

## Current limitations and next steps

- The extension currently supports email/password login. Google OAuth in a Chrome extension requires a separate `chrome.identity.launchWebAuthFlow` implementation.
- LinkedIn scraping depends on Apify actor availability, public profile access, and rate/cost limits.
- Generated messages are drafts. The user still reviews, edits, copies, and sends manually.
- Supabase migrations are not committed yet, so a new environment needs tables and RLS policies created manually.
- Future improvements could include dashboard filters/search, follow-up reminders, better retry handling, prompt templates, and production observability.

## Why this is relevant for hiring managers

This project demonstrates practical full-stack product engineering:

- End-to-end feature design across a web app, browser extension, backend API, third-party scraping service, LLM generation, authentication, and persistent storage.
- Secure API design where browser clients authenticate as users while server-only secrets remain protected.
- Real product thinking around user workflow, status tracking, editability, and manual user control instead of fully automated spam.
- Modern TypeScript/React development with Next.js App Router and a Manifest V3 extension.
- Integration of AI into a concrete workflow with structured prompts, JSON outputs, persistence, and error handling.

