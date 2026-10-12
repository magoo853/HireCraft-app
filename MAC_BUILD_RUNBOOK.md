# HireCraft — Your Side: App Store, Start to Finish

Everything on Jarvis's side is done (code, consent gate, listing copy, iOS
project, icons). This is your complete sequence. Parts A and B are the
critical path; Part C is finishing.

## Part A — App Store Connect (web, ~15 min, after enrollment approval)

1. Sign in at https://appstoreconnect.apple.com
2. **Business** (or Agreements, Tax, and Banking on the home page):
   accept the **Paid Applications Agreement**, add bank account + tax forms.
   Subscriptions cannot be created or sold until this shows "Active."
3. That's all until the build exists — the app record is created in Part B.

## Part B — Mac session (~30 min)

Prereqs: Xcode from the Mac App Store (open it once, accept the license),
Node 18+ (`node -v` in Terminal; if missing, https://nodejs.org).

```bash
cd ~/Documents
git clone https://github.com/magoo853/HireCraft-app.git
cd HireCraft-app
npm install
npm install @capacitor-community/in-app-purchases
npx cap sync ios
bash ios-assets/install-assets.sh
open ios/App/App.xcworkspace
```

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

1. App Store Connect → **My Apps** — HireCraft appears once the build
   processes (~5–15 min). If there's no app record: **+ → New App** →
   iOS, name **HireCraft**, primary language English, bundle ID
   `com.hirecraft.app`, SKU `hirecraft-001`.
2. **Monetization → Subscriptions**: create group **HireCraft Pro**, then
   product `hirecraft_pro_yearly`, $25.00/year, and add the introductory
   offer: **2 weeks free**. (Field-by-field text: `APP_STORE_LISTING.md`.)
3. **App Store tab**: paste name/subtitle/description/keywords from
   `APP_STORE_LISTING.md`; set the privacy policy URL and the App Privacy
   answers from the same file; select the uploaded build.
4. **TestFlight tab**: add yourself as an internal tester, install the
   TestFlight app on your phone, and run the build: consent gate → resume
   upload (try your .doc) → AI rewrite → job-alert check → one design
   export.
5. Tell Jarvis the build is in TestFlight — screenshots and the final
   review submission are a joint pass from there.

## Not on the critical path (later, at your pace)

- **SheerID / ID.me** developer signups — needed only for the 6-month
  military trial; ships as an update. Steps: `military-verification-signup-steps.md`.
- **USAJobs API key** (free, developer.usajobs.gov) — lights up federal
  jobs in job alerts. Send Jarvis the key + the email you registered with;
  it goes in as a server setting, never in the app.
- **privacy@hirecraft.app mailbox** — the privacy policy lists it as the
  contact; make sure the mailbox exists before submission.
