# HireCraft (working title)

AI resume & LinkedIn optimizer. Web app first (Next.js 14), iOS App Store via Capacitor later.

## What it does

- **3 modes** — Veteran transition (military→civilian translation), General job seeker, New to workforce (guided resume builder)
- **Resume input** — upload PDF/DOCX/TXT (parsed client-side), paste text, or build from scratch
- **Job tailoring** — paste a job posting URL (server fetches + extracts text, graceful fallback to manual paste), keyword match/missing analysis
- **ATS score dashboard** — 0–100 score with 6-component breakdown, formatting flags, readability, plus an "ATS simulator" showing what parsers actually read
- **Bullet rewrites** — side-by-side original vs. rewritten, one-line "why", gap flags (never invents facts)
- **Cover letters** — 3 tones (professional / confident / warm), editable, copy/download
- **5 design templates** — Classic, Modern, Minimal, Executive, Bold. Inline editing, Print → Save as PDF
- **LinkedIn builder** — headline options, About rewrite, polished bullets, skills-gap analysis
- **Career roadmap** (paid) — 2/5/10-year goals + salary targets → recommended titles with estimated salary bands (✓/⚠ vs. your target), stepping-stone roles, skill gaps; visual timeline
- **Discover** (paid; quiz + top-3 matches free) — 18-question RIASEC work-style quiz → Holland Code + job matches with fit scores, "why this fits", have-vs-missing skills per role
## Pricing

- **Free** — ATS score + breakdown, ATS simulator, keyword match preview. Free forever.
- **Paid — $25/year** — everything: unlimited bullet rewrites, job tailoring, cover letters, LinkedIn builder, all 5 templates + PDF export, career roadmap, full Discover matches. No feature-gating games beyond free/paid.
- **Military — 6 months free** — anyone currently serving or who has served gets the full paid tier free for 6 months.
- **Launch promo — 14-day trial** — for the first 30 days after launch, every new user gets the paid tier free for 14 days. Driven by `NEXT_PUBLIC_LAUNCH_DATE` (ISO date); the paywall shows "Launch special: try everything free for 2 weeks" dynamically while the window is open, then new users go straight to free-vs-$25/yr. Logic in `lib/promo.ts`; trial state (with expiry) persists in localStorage. Preview anytime with `?promo=preview` on the paywall URL. The military trial is permanent and unaffected by the promo window.

### Military verification (code-complete, credentials-pending)

The trial claim flow (`app/paywall`) offers **Verify with ID.me** and **Verify with SheerID** as primary
buttons, backed by a provider abstraction in `lib/verification.ts`:

- **ID.me** (`lib/verification.ts` → `idmeVerify`): OAuth 2.0 hosted flow. User is sent to
  `https://api.id.me/oauth/authorize` (scope `military`), we exchange the code at
  `https://api.id.me/oauth/token`, then read group affiliation from
  `https://api.id.me/api/public/v3/attributes.json`. Sandbox host: `api.idmelabs.com`.
- **SheerID** (`lib/verification.ts` → `sheeridCreateVerification` / `sheeridCheckStatus`):
  server creates a verification via `POST https://services.sheerid.com/rest/v2/verification`
  (Bearer token, `{programId}`), user completes it on SheerID's hosted form, and the app
  confirms via `GET /rest/v2/verification/{id}` (`result === true`). A webhook stub lives at
  `POST /api/verify/sheerid/webhook`.
- When no provider keys are configured, the flow gracefully falls back to the
  "I serve / I served" attestation + optional .mil email — never a dead button.

**What James needs to obtain:**

1. **ID.me** — register an app at the ID.me developer portal (developers.id.me), request the
   **military** group scope, and register this redirect URI in the app settings:
   `https://<your-app-url>/api/verify/idme/callback`
   → gives you `IDME_CLIENT_ID` + `IDME_CLIENT_SECRET` (use `IDME_SANDBOX=true` + idmelabs for testing).
2. **SheerID** — create an account/program at developer.sheerid.com for the **military segment**
   (active military + veterans); copy the **program ID** and generate an **API token** (Bearer).
   If you enable completion notifications, point the webhook at
   `https://<your-app-url>/api/verify/sheerid/webhook`.
3. Set `NEXT_PUBLIC_APP_URL` to the public deployment URL so callbacks build correctly.

Endpoint/param uncertainties (flagged in code comments in `lib/verification.ts`): the exact
ID.me group strings in `attributes.json`, SheerID's verification-result field shape, SheerID's
hosted-form return behavior, and the SheerID webhook payload format — confirm each in the
respective dashboard before production launch.

The paywall UI (`app/paywall/page.tsx`) is built; everything is unlocked in this web build — Apple IAP comes at packaging.

## AI layer

`POST /api/ai` handles `rewrite`, `cover-letter`, `linkedin` tasks.

- With `AI_API_KEY` set → calls your OpenAI-compatible endpoint (`AI_API_BASE`, default `https://api.openai.com/v1`; `AI_MODEL`, default `gpt-4o-mini`).
- Without a key → high-quality rules/template engine in `lib/fallback.ts` (deterministic scoring, keyword extraction, template rewrites, cover-letter scaffolds, LinkedIn content). **No button is ever dead.**

The key must be a server env var — never ship it client-side.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Copy `.env.example` to `.env.local` and add `AI_API_KEY` to enable full AI.

## Roadmap to the App Store

1. **Capacitor wrap** — `npm i @capacitor/core @capacitor/cli`, `npx cap init`, add iOS platform. The app is already mobile-first with ≥44px touch targets and safe-area padding.
2. **StoreKit IAP** — wire the paywall screen (`app/paywall/page.tsx`) to one product: Paid $25/year (auto-renewable subscription) via the Capacitor in-app-purchase plugin or RevenueCat. Gate rewrites/tailoring/letters/templates behind entitlement checks. Free tier stays free forever. The military trial grant (server cookie `hirecraft_trial`, mirrored to localStorage) becomes the entitlement check for trial users.
3. **Military verification** — replace the attestation demo with real SheerID or ID.me verification for the 6-month free trial before launch.
3. **Apple Developer** — $99/yr, App Store Connect listing, privacy policy (resume PII handling is documented in Settings), TestFlight beta.
4. **In-app AI key entry** — add an Integrations-style screen for the AI key (server-side proxy keeps the key off-device), plus an AI on/off toggle.
5. **Android** — only if iOS traction justifies it.

## Project structure

```
app/            # routes: resume, score, rewrite, design, letters, paywall, settings
app/api/ai/     # AI proxy + fallback router
app/api/fetch-job/  # job posting URL → text extraction
components/ui.tsx   # shared UI (buttons, cards, nav, score ring)
lib/fallback.ts # rules engine: scoring, keywords, rewrites, cover letters, LinkedIn
lib/parse.ts    # PDF/DOCX/TXT parsing + text→structured resume
lib/store.tsx   # app state (context + localStorage)
lib/templates.tsx # 5 resume design templates
lib/types.ts
```

## Privacy

Resumes stay on-device (localStorage) unless an AI key is configured, in which case text is sent only to the configured AI provider for generation. No training on user data. One-tap wipe in Settings.
