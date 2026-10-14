# ResumeRoadmap

AI resume & LinkedIn optimizer for veterans and civilian job seekers. Next.js 14 web app, live in production; an iOS App Store build wraps the same production site via Capacitor.

**Production: https://hirecraft-app-steel.vercel.app**

## What it does

- **3 modes** — Veteran transition (military→civilian translation), General job seeker, New to workforce (guided resume builder)
- **Resume input** — upload PDF/DOCX/DOC/TXT (`.doc` files are extracted server-side), paste text, or build from scratch
- **Job tailoring** — paste a job posting or its URL, keyword match/missing analysis against that posting
- **ATS score dashboard** — 0–100 score with 6-component breakdown, formatting flags, readability, plus an "ATS simulator" showing what parsers actually read
- **Bullet rewrites** — side-by-side original vs. rewritten, one-line "why", gap flags (never invents facts); in Veteran mode, performance-review text is mined for additional accomplishments
- **Cover letters** — 3 tones (professional / confident / warm), editable, copy/download
- **9 design templates** — Classic, Modern, Minimal, Executive, Bold, Slate, Ocean, Mono, plus a Custom Studio (user picks colors/fonts, formatting stays locked). Inline editing, Print → Save as PDF with template colors preserved
- **LinkedIn builder** — headline options, About rewrite, polished bullets, skills-gap analysis
- **Career roadmap** — 2/5/10-year goals + salary targets → recommended titles with estimated salary bands (✓/⚠ vs. your target), stepping-stone roles, skill gaps; visual timeline
- **Discover** — 18-question RIASEC work-style quiz → Holland Code + job matches with fit scores, "why this fits", have-vs-missing skills per role. Also **job alerts**: save a title/company/location + minimum match, and matching postings (Remotive, Himalayas, Arbeitnow; USAJobs when its keys are configured) are scored against the resume with why-you-match breakdowns. Alerts are in-app only in v1 — no push notifications yet.

## Pricing

- **Free** — ATS score + breakdown, ATS simulator, keyword match preview. Free forever.
- **Pro — $25/year** — everything: unlimited bullet rewrites, job tailoring, cover letters, LinkedIn builder, all templates + PDF export, career roadmap, full Discover matches.
- **Launch trial — 2 weeks free** — new users get Pro free for 14 days. In the App Store build this ships as the subscription's introductory offer; the web paywall's promo banner is driven by `NEXT_PUBLIC_LAUNCH_DATE` (logic in `lib/promo.ts`).
- **Military — 6 months free (post-launch update, not in v1)** — see the next section. It is not claimable in the current build.

**Current state of the paywall:** in the web build everything is unlocked and `/paywall` is an informational preview. Real entitlement gating ships with the native App Store build (StoreKit, product `hirecraft_pro_yearly`).

### Military verification — post-launch, NOT a working v1 flow

The 6-month free military tier is planned as a **post-launch update**. It is **not** live in v1:

- SheerID / ID.me verification is **not configured** in the production build, and there is no working verification flow for users today. The paywall says so in plain language ("Instant verification isn't configured in this build").
- Stub code exists in the repo (`lib/verification.ts`, routes under `app/api/verify/`) as scaffolding for that future update. Its env vars are listed in `.env.example` under a clearly marked post-launch section — **do not set them for v1**; setting them does not create a supported flow.
- When the update ships, verification will be handled by SheerID or ID.me; ResumeRoadmap will receive only a yes/no result, never military records.

## AI layer

`POST /api/ai` handles `rewrite`, `cover-letter`, `linkedin`, `roadmap`, `discover` tasks.

- **Provider: Google Gemini**, called server-side through Gemini's OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai`).
- **The API key is the operator's, set server-side as `AI_API_KEY`.** Users never supply their own key, and the key is never shipped to the client.
- **Models:** default `gemini-3.8-flash`, with a built-in fallback chain (`gemini-3.6-flash`, then `gemini-3.5-flash-lite`) and per-model retries on transient errors. (`gemini-2.0-flash` was retired by Google and is no longer used.)
- Optional overrides: `AI_API_BASE` / `AI_MODEL` point the same code at any other OpenAI-compatible provider/model.
- If no key is set or the provider is unavailable, a deterministic rules/template engine in `lib/fallback.ts` answers instead (scoring, keyword extraction, template rewrites, cover-letter scaffolds, LinkedIn content), and the response says so. **No button is ever dead.**
- **Consent:** on first launch the app discloses that resume text (and, in Veteran mode, job codes + performance-review text) is sent to Google Gemini when AI features are used, and nothing is sent until the user agrees. Consent can be withdrawn in Settings. `GET /api/ai-health` reports live AI status.
- **Email:** the app sends no email and uses no email provider (no Resend or similar) anywhere in the codebase.

## Run it (quickstart)

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Copy `.env.example` to `.env.local`. Set `AI_API_KEY` (the operator's Google AI Studio key) to enable live AI locally; without it the deterministic fallback engine handles every task. Users of the deployed app never see or enter this key.

## Verify

There is no automated test script yet. The pre-deploy gate is:

```bash
npm run build    # must pass clean
npm run lint
```

plus a manual pass over the main flows (upload → score → rewrite → design → export) and `GET /api/ai-health` on the deployment.

## Deploy

- Hosted on **Vercel** (project `hirecraft-app`, on the for-profit team — not the Code Red team). Pushes to `main` deploy automatically.
- Production: **https://hirecraft-app-steel.vercel.app** (note: `hirecraft-app.vercel.app` is an unrelated third-party site — do not use it).
- Environment variables are set in the Vercel project settings; see `.env.example` for the full list the code reads. `AI_API_KEY` is required for live AI in production.

## App Store status

- The Capacitor iOS project is pre-generated and committed under `ios/` (bundle ID `com.hirecraft.app`); `capacitor.config.ts` points the shell at the production URL above.
- **Source of truth for the submission:** `MAC_BUILD_RUNBOOK.md` (owner's step-by-step: agreements → Mac build → archive → upload) and `APP_STORE_LISTING.md` (paste-ready listing, privacy answers, review notes). `APP_STORE_CHECKLIST.md` tracks overall status.
- StoreKit subscription (created in App Store Connect at packaging): group "ResumeRoadmap Pro", product `hirecraft_pro_yearly`, $25/year, with the 2-week free introductory offer.
- Military verification (SheerID / ID.me) is a post-launch update — it does not gate the v1 submission.

## Project structure

```
app/            # routes: resume, score, rewrite, design, cover, linkedin,
                # roadmap, discover, paywall, settings, privacy, support
app/api/ai/     # AI proxy (Gemini) + fallback router
app/api/jobs/   # job-alert feed (Remotive / Himalayas / Arbeitnow / USAJobs)
app/api/extract/  # server-side .doc text extraction
app/api/verify/ # post-launch military-verification stubs (inactive in v1)
components/     # shared UI, consent gate, banners
lib/fallback.ts # rules engine: scoring, keywords, rewrites, cover letters, LinkedIn
lib/parse.ts    # PDF/DOCX/TXT parsing + text→structured resume
lib/careers.ts  # role data, RIASEC matching, MOS→civilian crosswalk
lib/jobs.ts     # job alerts + posting scoring
lib/store.tsx   # app state (context + localStorage)
lib/templates.tsx # 9 resume design templates (incl. Custom Studio)
lib/types.ts
```

## Privacy

Resumes are stored only on the user's device (localStorage). When — and only when — the user uses an AI feature after agreeing to the first-launch consent disclosure, the relevant text is sent to Google Gemini for generation; it is never sold and never used for advertising. Job alerts send only the alert's search terms to job-board APIs, never the resume. Full policy at `/privacy`; help and contact at `/support`. One-tap wipe of all local data lives in Settings.
