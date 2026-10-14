# ResumeRoadmap — Your Side: App Store, Start to Finish

Everything on Jarvis's side is done (code, consent gate, listing copy, iOS
project, icons). This is your complete sequence. Parts A and B are the
critical path; Part C is finishing.

## Part A — App Store Connect (web, ~15 min, after enrollment approval)

1. Sign in at https://appstoreconnect.apple.com
2. **Business** (or Agreements, Tax, and Banking on the home page):
   accept the **Paid Applications Agreement**, add bank account + tax forms.
   Subscriptions cannot be created or sold until this shows "Active."
3. **My Apps → + → New App**: iOS, name **ResumeRoadmap**, primary
   language English (U.S.), bundle ID `com.hirecraft.app`, SKU
   `hirecraft-001`. Create the record NOW — the Part B upload needs an
   existing app record to land in.

## Part B — Mac session (~30 min)

Prereqs: Xcode from the Mac App Store (open it once, accept the license),
Node 18+ (`node -v` in Terminal; if missing, https://nodejs.org).

```bash
cd ~/Documents
git clone https://github.com/magoo853/HireCraft-app.git
cd HireCraft-app
npm install
npx cap sync ios
bash ios-assets/install-assets.sh
open ios/App/App.xcworkspace
```

(The StoreKit bridge — `cordova-plugin-purchase` — is already a declared
dependency, so `npm install` + `cap sync` wire it; do NOT install
`@capacitor-community/in-app-purchases`, which no longer exists on npm.
The paywall's purchase/restore flow is already coded against it — RR-01.
What remains here is the Xcode capability toggle below, creating the
`hirecraft_pro_yearly` product in App Store Connect, and the sandbox
purchase test.)

Notes:
- `cap sync` printing a warning about a "www directory" is expected — the
  app loads its live web build; a placeholder page is bundled.
- If `cap sync` says CocoaPods is missing: `sudo gem install cocoapods`,
  then run `npx cap sync ios` again.
- `install-assets.sh` places the real app icon + splash screens (they
  travel through git encoded; the script decodes them — no installs).

In Xcode:
1. Click the **App** project (top of the left panel) → **App** target →
   **Signing & Capabilities** → check **Automatically manage signing** →
   Team: your name / Apple ID. Bundle ID must read `com.hirecraft.app`.
2. Same screen: **+ Capability** → add **In-App Purchase**.
3. Top center: set the run destination to **Any iOS Device (arm64)**.
4. Menu **Product → Archive**. When the Organizer opens:
   **Distribute App → App Store Connect → Upload** (defaults are fine).
5. The encryption question is already answered in the project — if asked
   anyway: "None of the algorithms mentioned" / standard HTTPS only.

## Part C — After the upload (~20 min, web)

1. App Store Connect → **My Apps → ResumeRoadmap** (the record from
   Part A): the uploaded build appears under **TestFlight** once it
   processes (~5–15 min).
2. **Monetization → Subscriptions**: create group **ResumeRoadmap Pro**, then
   product `hirecraft_pro_yearly`, $25.00/year, and add the introductory
   offer: **2 weeks free**. (Field-by-field text: `APP_STORE_LISTING.md`.)
3. **App Store tab**: paste name/subtitle/description/keywords from
   `APP_STORE_LISTING.md`; set the privacy policy URL and the App Privacy
   answers from the same file; select the uploaded build.
4. **TestFlight tab**: add yourself as an internal tester, install the
   TestFlight app on your phone, and run the build: consent gate → resume
   upload (try your .doc) → AI rewrite → job-alert check → one design
   export → **Premium: run the sandbox purchase and Restore** (sign in
   with a sandbox tester account when the App Store sheet asks — this is
   the RR-01 end-to-end test).
5. Tell Jarvis the build is in TestFlight — screenshots and the final
   review submission are a joint pass from there.

## Not on the critical path (later, at your pace)

- **SheerID / ID.me** developer signups — needed only for the 6-month
  military trial; ships as an update. Steps: `military-verification-signup-steps.md`.
- **USAJobs API key** (free, developer.usajobs.gov) — lights up federal
  jobs in job alerts. Send Jarvis the key + the email you registered with;
  it goes in as a server setting, never in the app.
- **Adzuna developer keys** (free, developer.adzuna.com) — an app ID +
  app key that light up the Adzuna source in job alerts. Send both to
  Jarvis; they go in as server settings (`ADZUNA_APP_ID` /
  `ADZUNA_APP_KEY`), never in the app. Until then the alerts run on the
  keyless sources and the Discover footer honestly omits Adzuna.
- **privacy@hirecraft.app mailbox** — the privacy policy lists it as the
  contact; make sure the mailbox exists before submission.
