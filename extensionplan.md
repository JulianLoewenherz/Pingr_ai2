# Chrome Extension Implementation Plan (Pingr MVP)

This document explains how to build the Pingr Chrome extension so it works with your existing Next.js backend and web app. It also covers what you need to know before building an extension.

---

## Clarification: Option A vs the Extension

- **Option A (router.refresh())** is already implemented **in the web app**: when a user generates a draft on `/app/prospects`, the prospects list refreshes without a full page reload. That only runs when the user is on the dashboard.
- **The extension** is a separate UI (Chrome side panel) that also calls the same backend APIs. The extension does not run Next.js or `useRouter()`. So:
  - When the user generates from the **dashboard** → Option A runs → list updates in that tab.
  - When the user generates from the **extension** → the extension gets the response and shows the draft in the side panel; the dashboard tab (if open) will **not** auto-refresh unless you add something like Supabase Realtime later.

This plan is about building the extension itself and wiring it to your existing API.

---

## Must-knows Before Building an Extension

### 1. Extension architecture (Manifest V3)

- **Manifest V3 (MV3)** is what Chrome expects for new extensions. Your extension is a zip of static assets (HTML/JS/CSS) plus a `manifest.json` that declares permissions, background script, and UI entry points.
- **No Node/Next.js in the extension**: The extension runs in the browser as a separate origin (`chrome-extension://<id>`). You build the extension with a bundler (e.g. Vite, WXT) that produces static files; you don’t run a server inside the extension.

### 2. Extension contexts (where code runs)

| Context | Where it runs | Typical use |
|--------|----------------|-------------|
| **Side panel / Popup** | UI the user opens (side panel or popup). Has its own DOM and JS. | Your main UI: show draft, Copy, Regenerate, Mark sent. |
| **Background (service worker)** | Long-lived script (MV3: service worker). No DOM. | Orchestration: e.g. get current tab URL, pass to API; optional messaging. |
| **Content script** | Injected into specific web pages (e.g. linkedin.com). Shares DOM with the page, limited JS environment. | Optional: inject UI into the page; here we use side panel instead. |

For Pingr MVP you mainly need: **side panel** (React UI) and **background** only if you need to read the active tab URL from a service worker. Many setups get the tab URL from the side panel via `chrome.tabs` API.

### 3. Permissions

- Declared in `manifest.json`. Request only what you need.
- **Suggested for Pingr**: `activeTab` (to get the URL of the tab where the user clicked the extension), optional `storage` if you store a session token, and **host permission** for your backend (e.g. `https://localhost:3000/*` for dev, later your production domain) so the extension can call your API without CORS blocking (extension requests with host permission are not subject to same-origin policy the same way as a random website).

### 4. Auth: why cookies don’t “just work”

- The **web app** uses cookie-based Supabase auth. When the user visits `https://yourapp.com`, the browser sends cookies with every request to that origin.
- The **side panel** is served from `chrome-extension://<id>`. When the side panel does `fetch('https://yourapp.com/api/generate', ...)`, that request is from the extension origin, not from yourapp.com. By default, the browser does **not** attach yourapp.com cookies to that request. So your backend would see an unauthenticated request.
- So you need an **extension-specific auth strategy**: e.g. the user logs in in a tab (or the app opens in a tab), and the app passes a **session token** (or short-lived API token) to the extension (e.g. via `chrome.runtime.sendMessage` from a content script on your app’s origin, or via a dedicated “Connect extension” page that writes the token to `chrome.storage`). The extension then sends that token (e.g. `Authorization: Bearer <token>`) on every API request. Your backend would need to accept that token and resolve the user (e.g. Supabase has ways to verify a session token server-side).

### 5. CORS and host permissions

- Your Next.js API is on `localhost:3000` (dev) or your production domain. The extension’s `fetch` to that URL is a cross-origin request. With **host permission** in the manifest (e.g. `"https://localhost:3000/*"`), the extension is allowed to make requests to that origin. Your API can allow requests from the extension by not blocking them (or by allowing the extension origin in CORS if you ever need to allow other origins; for extension-only, host permission is enough).

### 6. WXT (recommended framework)

- **WXT** is a framework for building browser extensions with modern tooling (Vite, React, TypeScript). It generates the correct manifest, entry points for side panel/popup/background, and handles dev and build. Using WXT + React keeps the extension stack close to your Next.js app and is a good fit for a side panel UI.

---

## Implementation Plan

### Phase 1: Scaffold the extension (same repo or sibling folder)

1. **Create the extension package**
   - Option A: Inside the repo, e.g. `Pingr_ai2/extension/` (WXT project).
   - Option B: Sibling folder, e.g. `Pingr_ai2/` and `Pingr_ai2_extension/`.
   - Recommended: **Option A** so docs and backend stay in one repo.

2. **Initialize with WXT**
   - Run `npm create wxt@latest` (or equivalent) in `extension/`, choose React + TypeScript.
   - When prompted, choose **side panel** as the main UI (and optionally popup if you want an icon that opens the side panel).

3. **Configure manifest**
   - Set **host permissions** to your backend: e.g. `http://localhost:3000/*` for dev. Add production URL when you deploy.
   - Add permission: `activeTab` (to get current tab URL).
   - Add permission: `storage` if you will store a session token for the extension.
   - Ensure manifest is **Manifest V3**.

4. **Verify**
   - Run `npm run dev` in the extension folder, load the unpacked extension in `chrome://extensions` (point to the output directory WXT gives you). Open the side panel and confirm it renders.

### Phase 2: Get LinkedIn URL and call generate API

1. **Get current tab URL**
   - In the side panel (React), use `chrome.tabs.query({ active: true, currentWindow: true })` to get the active tab’s URL. (You may need to request `activeTab` or `tabs` permission; WXT/manifest will guide.)
   - Validate that the URL is a LinkedIn profile: `linkedin.com/in/...`. If not, show a message: “Open a LinkedIn profile page and try again.”

2. **Auth for API calls (must-know)**
   - Your backend today uses **cookie-based auth** (Supabase via `createClient()`). The extension cannot send those cookies with `fetch` from the side panel.
   - **Recommended approach**: Add a small auth flow for the extension:
     - **Option (a)** — Token in URL (one-time handshake): On the web app, add a page (e.g. `/app/extension-auth`) that only loads when the user is logged in. That page runs a script that gets the current Supabase session (e.g. `supabase.auth.getSession()`), extracts an access token (or a short-lived token you issue), and communicates with the extension (e.g. via `chrome.runtime.sendMessage` from a content script injected on that page, or by redirecting to a special URL that the extension captures). The extension stores this token in `chrome.storage.local` and sends it as `Authorization: Bearer <token>` on every request to your API.
     - **Option (b)** — Same-origin iframe: Side panel embeds an iframe pointing to `https://yourapp.com/app/extension-auth`. The iframe runs in your app’s origin, so it has cookies. The iframe’s JS gets the session and posts a message to the parent (extension). The extension receives the token and stores it. (Some browsers restrict iframe in extension; test.)
   - **Backend change**: Add a way to authenticate requests that send `Authorization: Bearer <token>`. Supabase provides `getUser(jwt)` or similar; use that in your API route when the cookie is missing but the header is present, so the same `POST /api/generate` and `POST /api/prospects/status` routes work for both the web app (cookie) and the extension (Bearer token).

3. **Call `POST /api/generate`**
   - From the side panel: `fetch(`${API_BASE}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ linkedinUrl: currentTabUrl }) })`.
   - Use the same request/response shape as the web app: `{ prospect, draft }` or `{ error }`.
   - Handle loading (Apify can take 10–30s), success, and errors (401 → “Please log in on the Pingr website and connect the extension”).

4. **UI in side panel**
   - Show: prospect summary (name, headline, company), generated message, personalization note (if any).
   - Buttons: **Copy**, **Regenerate**, **Mark sent** (and optionally **Replied**, **Follow-up needed**).
   - Copy: `navigator.clipboard.writeText(draft.draft_text)`. Then call `POST /api/prospects/status` with `{ prospectId, status: 'copied' }` (same as web app).
   - Regenerate: call `POST /api/generate` again with the same LinkedIn URL.
   - Mark sent (and others): call `POST /api/prospects/status` with the chosen status.

### Phase 3: Polish and security

1. **Token storage**
   - Store the token in `chrome.storage.local`. Clear it on “Log out” in the extension (or when the API returns 401).
   - Prefer short-lived tokens or refresh flow if Supabase supports it, so a stolen token has limited use.

2. **Dashboard not auto-refreshing**
   - As noted above, when the user generates from the extension, the dashboard tab does not run `router.refresh()`. For MVP, the user can refresh the dashboard. Later you can add Supabase Realtime so the open dashboard subscribes to new prospects and updates when the extension (or anything else) inserts a row.

3. **Production**
   - Set `API_BASE` (or env) to your production Next.js URL. Add that URL to manifest host permissions. Ensure your API accepts the extension’s Bearer token and CORS/host rules are correct.

---

## Summary Checklist

- [ ] Create extension folder (e.g. `extension/`) and scaffold with WXT + React (side panel).
- [ ] Set manifest: MV3, host permission to backend, `activeTab`, `storage` if using token.
- [ ] Implement “get current tab URL” and LinkedIn URL validation in side panel.
- [ ] Add extension auth: app page or iframe that provides a session/API token to the extension; extension stores it and sends `Authorization: Bearer <token>`.
- [ ] Backend: support auth via Bearer token in addition to cookie (same `/api/generate` and `/api/prospects/status`).
- [ ] Side panel: call `POST /api/generate` with LinkedIn URL and token; show prospect + draft; Copy / Regenerate / Mark sent (and other statuses) via `POST /api/prospects/status`.
- [ ] Test: log in on web app, connect extension (get token), open LinkedIn profile, open side panel, generate draft, copy, mark sent; then open dashboard and confirm prospect appears (after refresh or later with Realtime).

This plan gives you a clear path from “Option A done in the web app” to “extension that reuses the same API and shows the draft in the side panel,” with the must-knows (auth, permissions, no Next.js in extension) made explicit so you can start implementing step by step.
