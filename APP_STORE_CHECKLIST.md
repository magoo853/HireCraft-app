# HireCraft — App Store Checklist

Everything needed to get HireCraft from "working web app" to "live on the App Store."
Items marked **[JAMES]** need James directly. Everything else is buildable by the crew.

## 0. Current state (2026-10-11)

- [x] Next.js 14 app builds green (`npm run build`)
- [x] Private GitHub repo `magoo853/hirecraft-app`
- [x] Vercel project `hirecraft-app` (separate for-profit team), production: https://hirecraft-app-steel.vercel.app
- [x] Privacy policy live at `/privacy`
- [x] Capacitor config (`com.hirecraft.app`) + icon/splash assets
- [ ] **[JAMES]** Apple Developer Program enrollment ($99/yr) — <https://developer.apple.com/programs/enroll/>
- [ ] **[JAMES]** SheerID account + API key (military verification)
- [ ] **[JAMES]** ID.me developer app registration (military verification)
- [x] AI API key (`AI_API_KEY`) live in Vercel; all AI tasks production-verified 2026-10-12
- [x] **[JAMES]** Apple Developer enrollment submitted 2026-10-12 (approval pending)
- [x] AI data-sharing consent gate shipped (Guideline 5.1.2)
- [x] Mac build runbook + paste-ready listing pack written (`MAC_BUILD_RUNBOOK.md`, `APP_STORE_LISTING.md`)

## 1. Apple Developer enrollment [JAMES]

1. Enroll as an **Individual** (fastest) at developer.apple.com — $99/yr.
2. Enable two-factor auth on the Apple ID used.
3. After approval (usually 24–48h), accept the Paid Applications agreement in App Store Connect → Agreements, Tax, and Banking (required before any paid app/IAP).
4. Add banking + tax info in App Store Connect.

## 2. Native shell (needs a Mac — one-time)

Capacitor wraps the hosted web app; the Xcode project must be generated on macOS:

```bash
npm install
npx cap add ios        # generates ios/ (commit it)
npx cap sync ios       # copies www/ + config into the native project
```

- Icons: run `python3 ios-assets/generate-icons.py` — produces the full
  AppIcon set (1024 master + 180/167/152/120/87/80/60/58/40/29/20). Drop the
  output into `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.
- Splash: `ios-assets/splash.svg` → export 2732×2732 PNG, set as launch
  storyboard image (or rely on the Capacitor SplashScreen plugin config).
- Open `ios/App/App.xcworkspace` in Xcode, set the Team (James's Apple ID),
  bump version/build numbers, Archive → Distribute → App Store Connect.

> Note for review: v1 loads the hosted production URL in the shell. This is a
> common pattern, but Apple sometimes pushes back on "app is just a website."
> Mitigations already in place: native-feel UI, offline-tolerant screens, and
> real StoreKit IAP (step 5). If review flags it, the fallback is a
> static-export refactor (`output: "export"`) with API routes moved to the
> Vercel backend.

## 3. App Store Connect listing

- **Name:** HireCraft — AI Resume & LinkedIn Optimizer (30 char limit)
- **Subtitle:** ATS scores, rewrites & cover letters (30 chars)
- **Bundle ID:** `com.hirecraft.app` — register in Identifiers, enable In-App Purchase capability
- **Category:** Business (primary), Productivity (secondary)
- **Age rating:** 4+ (no objectionable content; questionnaire will confirm)
- **Privacy policy URL:** `https://<production-url>/privacy`
- **Support URL:** repo or landing page URL
- **Keywords:** resume builder,ats checker,resume score,cover letter,linkedin optimizer,job search,veteran jobs (100 chars max, comma-separated, no spaces)
- **Description:** lead with the veteran wedge + free scan; mention $25/yr, free tier, military 6-month trial, launch 2-week trial

## 4. Screenshots (required sizes)

- **6.7"** (1290×2796): 3–10 screenshots — iPhone 15 Pro Max simulator
- **6.5"** (1242×2688): required if 6.7" not provided — just do 6.7"
- **5.5"** (1242×2208): legacy — optional in 2026, skip unless asked
- **iPad 13"** (2048×2732): only if shipping iPad — v1 is iPhone-only, set
  device family accordingly
- Capture: home/onboarding, ATS score, rewrite diffs, templates, cover
  letter, LinkedIn builder, paywall (7 total — matches the QA set)

## 5. In-App Purchase (StoreKit 2) — after TestFlight, before submission

- Create subscription group "HireCraft Pro" in App Store Connect
- Product: `hirecraft_pro_yearly` — $25.00/yr, auto-renewable
- Free 2-week launch trial and 6-month military trial: implement as
  **introductory offers** on the subscription (2-week free; 6-month free
  requires verification *before* purchase — gate the offer behind the
  SheerID/ID.me check in-app, then present the IAP)
- Fill in the subscription's review notes: explain the military trial and
  how reviewers can test it (provide a sandbox test path)
- Paid Applications agreement must be active (step 1.3) or IAP stays
  in "Missing Metadata"

## 6. TestFlight

1. Upload build via Xcode → appears in App Store Connect → TestFlight
2. Add James + internal testers (up to 100, no review needed)
3. External beta (up to 10,000): requires **Beta App Review** — include
   the same review notes as step 5, plus a demo account if login exists
4. Test the full loop: free scan → paywall → sandbox purchase → military
   trial claim → cancel

## 7. App Review landmines (handled or flagged)

- **5.1.1 Data collection:** privacy policy declares no training on user data,
  no sale of data, delete-on-request. Privacy Nutrition Labels in App Store
  Connect must match: "Data Not Collected" is wrong (we collect resume text)
  → declare *Contact Info, User Content* linked to user, not used for tracking.
- **3.1.1 IAP:** all digital unlocks go through StoreKit — no Stripe/web
  paywalls linked from the app.
- **2.3.1 Performance:** no placeholder buttons — every control works
  (template fallback covers no-API-key state).
- **4.2 Minimum functionality:** see the webview note in step 2.
- **Military trial:** reviewers will ask how to test it — provide a sandbox
  bypass code documented in review notes (implement `MILITARY_REVIEW_CODE`
  env-gated test path before submission).

## 8. Launch-day sequence

1. Flip `NEXT_PUBLIC_LAUNCH_DATE` to launch day (starts the 30-day 2-week-trial promo window)
2. Submit for review (24–48h typical)
3. On approval: release manually (don't auto-release), verify IAP + trials in production
4. Start the TikTok content engine (see `~/workspace/app-ideas/1m-portfolio-plan.md`)
