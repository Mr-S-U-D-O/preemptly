# Preemptly

Preemptly is a real-time lead intelligence platform that monitors public conversations (Reddit and Stack Overflow), scores buying intent with AI, and routes qualified opportunities into an internal dashboard and a client-facing portal.

## What this project does

Preemptly continuously runs "monitors" (called scrapers in code) that:

1. Pull fresh posts from platform RSS feeds.
2. Deduplicate and filter them efficiently.
3. Score intent with Gemini.
4. Store and surface qualified leads in Firestore.
5. Let providers and clients collaborate on follow-up through a portal and chat.

## Who it is for

- **Agencies and consultants** doing high-ticket outbound/inbound prospecting.
- **B2B teams** that need early buying-signal detection.
- **Operators** who want a shared provider/client workflow instead of one-sided lead exports.

## Product surfaces

### 1) Public site (SEO + landing)
- Host-aware routing in `src/App.tsx` sends public hostnames to `LandingPage`.
- Programmatic SEO pages are served on `/intercept/:slug` from `src/data/pseo.ts`.

### 2) Provider HQ app
- Authenticated app for monitor setup, analytics, logs, CRM, and chat management.
- Main routes include home, scraper details, logs, CRM, and inbox.

### 3) Client portal
- Tokenized portal route (`/portal/:token` or `/:token`) for clients.
- Shows matched leads, feedback workflow, outcomes, AI-assisted comments, and real-time chat.

## How it works from the ground up

### 1) Frontend runtime

- React + Vite app (`src/main.tsx`, `src/App.tsx`).
- Firebase client SDK initialized in `src/firebase.ts`.
- `AuthProvider` handles sign-in and allowlist gating.
- `DataProvider` hydrates the HQ UI from Firestore:
  - Real-time listener for scrapers (`onSnapshot`).
  - Cost-controlled reads for leads/logs (throttled one-time fetch + count queries).

### 2) API/server runtime

- `server.ts` runs Express and also hosts Vite middleware in development.
- Key API groups:
  - **System/SEO**: `/api/health`, `/robots.txt`, `/sitemap.xml`
  - **AI assist**: `/api/suggest-keywords`, `/api/suggest-targets`
  - **RSS utility**: `/api/reddit/:subreddit`
  - **Portal APIs**: fetch portal data, setup, lead actions, AI comment generation, chat + presence

### 3) Background intelligence engine

Started by `server.ts` after boot:

- A scheduler runs `runBackgroundScrapers` every 2 minutes.
- Active scrapers are cached via Firestore real-time listener (no full polling loop each cycle).
- For each scraper due to run:
  1. Fetch posts from Reddit/Stack Overflow RSS through proxy endpoints.
  2. Normalize post data.
  3. Deduplicate using deterministic lead IDs (`sha256(scraperId::postUrl)`), plus in-memory cache.
  4. Apply date-fence filtering around last run to avoid rescanning stale feed items.
  5. Score in AI batches (20 posts per batch) with Gemini.
  6. Save qualified matches to `leads` with batched writes.
  7. Update scraper run state and logs.

Reliability protections in engine internals:
- Exponential retry backoff based on consecutive failures.
- Auto-pause after repeated failures.
- Recovery path resets error counters after successful runs.

### 4) Data model (Firestore)

Core collections:
- `scrapers`: monitor configs + client portal settings.
- `leads`: scored opportunities + interaction metadata.
- `logs`: activity and error events.
- `portal_chats`: chat room metadata.
- `portal_chats/{token}/messages`: chat message stream.
- `beta_applicants`, `login_attempts`: CRM/admission/ops tracking.

Rules and validation:
- `firestore.rules` enforces authenticated ownership for HQ data.
- Includes schema-like field constraints for create/update paths.

### 5) Client collaboration internals

Portal flow:
- Provider deploys a token to one or more related scrapers.
- Client opens portal link and gets merged lead feed across all associated scrapers.
- Lead actions (clicks, feedback, outcome, delete) are tracked server-side.
- Optional AI comment generation uses per-client tone/aggression/length settings.
- Chat uses SSE stream + Firestore snapshots for near real-time updates.

## Technology stack

- **Frontend**: React, Vite, TypeScript, Tailwind, Recharts
- **Backend**: Node.js, Express, TypeScript (`tsx` runtime)
- **AI**: Google Gemini via `@google/genai`
- **Data/Auth**: Firebase Firestore + Firebase Auth + Firebase Admin SDK
- **Feeds**: RSS parsing (`rss-parser`) with proxy/bypass strategy

## Local development

## Prerequisites
- Node.js 20+
- npm
- Firebase project config in `firebase-applet-config.json`
- Environment variables for Gemini/API and Firebase credentials as needed

## Install

```bash
npm install
```

## Run dev server

```bash
npm run dev
```

## Type check

```bash
npm run lint
```

## Production build

```bash
npm run build
```

## Key scripts

From `package.json`:
- `npm run dev` → run `server.ts` via `tsx`
- `npm run start` → run `server.ts`
- `npm run lint` → TypeScript no-emit check
- `npm run build` → generate sitemap + build frontend assets

## File map

- `server.ts` — API server + background engine
- `src/App.tsx` — host-based routing and app entry
- `src/components/AuthProvider.tsx` — auth and access gate
- `src/components/DataProvider.tsx` — Firestore data subscriptions and hydration
- `src/components/ClientPortal.tsx` — portal UI + chat client
- `src/data/pseo.ts` — pSEO content matrix
- `generate-sitemap.ts` — sitemap generation at build time
- `firestore.rules` — Firestore access/data rules

## Current operating model (high-level)

Preemptly is designed as a continuous loop:

**Monitor setup → Feed ingestion → Intent scoring → Lead persistence → Provider/client collaboration → Outcome tracking**

That loop is the core of the system and where most internal complexity lives.
