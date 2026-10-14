# ResumeRoadmap — App Store Checklist

Everything needed to get ResumeRoadmap from "working web app" to "live on the App Store."
Items marked **[JAMES]** need James directly. Everything else is buildable by the crew.

## 0. Current state (2026-10-14)

- [x] Next.js 14 app builds green (`npm run build`)
- [x] Private GitHub repo `magoo853/HireCraft-app`
- [x] Vercel project `hirecraft-app` (separate for-profit team), production: https://hirecraft-app-steel.vercel.app
- [x] Privacy policy live at `/privacy`
- [x] Capacitor config (`com.hirecraft.app`) + icon/splash assets
- [ ] **[JAMES]** Apple Developer Program enrollment ($99/yr) — <https://developer.apple.com/programs/enroll/>
- [ ] **[JAMES]** SheerID account + API key (military verification — post-launch update, NOT needed for v1)
- [ ] **[JAMES]** ID.me developer app registration (military verification — post-launch update, NOT needed for v1)
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

- Icon + splash: run `bash ios-assets/install-assets.sh` — it decodes the
  shipped assets (1024 icon, 2732×2732 splash) into the native asset
  catalog. The native imageset does the splash work; there is no
  splash-screen plugin config (removed as inert — RR-18).
- Open `ios/App/App.xcworkspace` in Xcode, set the Team (James's Apple ID),
  bump version/build numbers, Archive → Distribute → App Store Connect.

> Note for review: v1 loads the hosted production URL in the shell. This is a
> common pattern, but Apple sometimes pushes back on "app is just a website."
> Mitigations already in place: native-feel UI and the native shell
> features that exist today (app icon, splash screen, device share and
> open-in-browser handoffs). StoreKit IAP wiring IS in place (RR-01,
> code-done 2026-10-14: `cordova-plugin-purchase` + `lib/purchases.ts` +
> the native paywall branch). What remains for the Mac session is only
> the Xcode In-App Purchase capability toggle and the sandbox purchase
> test; the product itself is created in App Store Connect (step 5). If review flags it, the fallback is a
> static-export refactor (`output: "export"`) with API routes moved to the
> Vercel backend.

## 3. App Store Connect listing

(The app record itself is created first — App Store Connect → My Apps →
+ → New App; see the runbook, Part A. The listing pack
`APP_STORE_LISTING.md` is the source of truth for every string below.)

- **Name:** ResumeRoadmap — Resume Builder (30 chars)
- **Subtitle:** ATS Score, Rewrites & Jobs (26 chars)
- **Bundle ID:** `com.hirecraft.app` — register in Identifiers, enable In-App Purchase capability
- **Category:** Business (primary), Productivity (secondary)
- **Age rating:** 4+ (no objectionable content; questionnaire will confirm)
- **Privacy policy URL:** `https://<production-url>/privacy`
- **Support URL:** repo or landing page URL
- **Keywords:** resume builder,ats checker,resume score,cover letter,linkedin,veteran jobs,job search,career (100 chars max, comma-separated, no spaces — string identical to the listing pack)
- **Description:** lead with the veteran wedge + free scan; mention $25/yr, free tier, the launch 2-week trial, and the military 6-month offer **in future tense only** ("coming in a free update" — it is NOT in v1; do not promise it at launch)

## 4. Screenshots (required sizes)

- **6.9"** (1320×2868): the required set — 8 screenshots, iPhone 16 Pro
  Max class simulator (or the largest available); it scales down to the
  smaller displays automatically
- **6.7"** (1290×2796): optional additional set — skip unless asked
- **5.5"** (1242×2208): legacy — optional in 2026, skip unless asked
- **iPad:** none — v1 is iPhone-only and the device family is already
  set to iPhone ("1") in the Xcode project (RR-10)
- Capture, in the listing pack's order: home/persona picker, ATS score
  with drill-down open, rewrite before/after, design templates, cover
  letter, LinkedIn builder, Discover job alerts, roadmap checkpoints
  (8 total — identical to `APP_STORE_LISTING.md` § Screenshots; the
  paywall shot belongs to the subscription's review materials, §5)

## 5. In-App Purchase (StoreKit 2) — after TestFlight, before submission

- Create subscription group "ResumeRoadmap Pro" in App Store Connect
- Product: `hirecraft_pro_yearly` — $25.00/yr, auto-renewable
- Free 2-week launch trial: implement as an **introductory offer** on
  the subscription (2-week free, available to all new subscribers).
- 6-month military trial: implement as a **promotional offer**, NOT an
  introductory offer — introductory offers can't be gated per-user. The
  promotional offer requires verification *before* purchase — gate it
  behind the SheerID/ID.me check in-app, then present the IAP.
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
  → declare *User Content + Contact Info*, **neither linked to the user's
  identity, not used for tracking, purpose: App Functionality** — the parser
  extracts email/phone into the resume object that AI features send, so
  Contact Info is declared alongside User Content (matches the listing pack).
- **3.1.1 IAP:** all digital unlocks go through StoreKit — no Stripe/web
  paywalls linked from the app.
- **2.3.1 Performance:** no placeholder buttons — every control works
  (template fallback covers no-API-key state).
- **4.2 Minimum functionality:** see the webview note in step 2.
- **Military trial:** CLOSED — not in v1 by design. The product deliberately
  has no reviewer bypass: there is no `MILITARY_REVIEW_CODE` test path to
  implement before submission (a pre-submission implementation requirement
  for it previously stood here and is formally closed by this note).
  Military verification is fail-closed in v1 and the 6-month offer ships in
  a post-launch update; the review notes in the listing pack say exactly that.

## 8. Launch-day sequence

1. Flip `NEXT_PUBLIC_LAUNCH_DATE` to launch day (starts the 30-day 2-week-trial promo window)
2. Submit for review (24–48h typical)
3. On approval: release manually (don't auto-release), verify IAP + trials in production
4. Start the TikTok content engine (see `~/workspace/app-ideas/1m-portfolio-plan.md`)
