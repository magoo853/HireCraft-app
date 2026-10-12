# HireCraft — Mac Build Runbook (James, ~30–45 min at the keyboard)

Run these in order in Terminal on your Mac, once your Apple Developer
enrollment is approved. Everything else (code, icons, listing copy) is
already prepared — this is just the native packaging only a Mac can do.

## 0. Prerequisites

- Xcode installed from the Mac App Store (open it once and accept the license).
- Node 18+ (`node -v`; if missing: https://nodejs.org).
- In App Store Connect: Paid Applications agreement accepted, banking + tax done.

## 1. Get the code

```bash
cd ~/Documents   # or wherever you keep projects
git clone https://github.com/magoo853/HireCraft-app.git
cd HireCraft-app
npm install
```

## 2. Add the native iOS project + IAP plugin

```bash
npm install @capacitor-community/in-app-purchases
npx cap add ios
npx cap sync ios
```

## 3. App icon

```bash
python3 ios-assets/generate-icons.py
```

Then drag the generated PNGs into Xcode:
`ios/App/App/Assets.xcassets/AppIcon.appiconset/` (open the project first, step 4,
and use the asset catalog editor — match each size slot).

## 4. Sign and build

```bash
open ios/App/App.xcworkspace
```

In Xcode:
1. Select the **App** target → *Signing & Capabilities* → check
   **Automatically manage signing** → Team = your Apple ID.
2. Add the **In-App Purchase** capability (the + Capability button).
3. Bundle ID must read `com.hirecraft.app`.
4. Top bar: choose **Any iOS Device (arm64)** as the run destination.
5. Menu **Product → Archive**. When it finishes, the Organizer opens →
   **Distribute App → App Store Connect → Upload**.

## 5. TestFlight

- In App Store Connect → HireCraft → TestFlight, the build appears after
  processing (~5–15 min). Add yourself as an internal tester, install via
  the TestFlight app, and run through: consent gate, resume upload (.doc
  too), one AI rewrite, job alerts check.
- Fill in the export-compliance prompt: the app uses only standard HTTPS
  encryption → answer accordingly (the Info.plist flag
  `ITSAppUsesNonExemptEncryption = false` can be set to skip the prompt).

## 6. Hand back to Jarvis

Tell Jarvis the build is uploaded. Remaining submission steps (subscription
product creation in App Store Connect, listing fields, screenshots, privacy
labels, review notes) are pre-drafted in `APP_STORE_LISTING.md` — we walk
through them together or you paste per that doc.

## Notes

- `ios/` is generated, not hand-edited. If anything looks wrong, delete
  `ios/` and redo step 2 — don't hand-fix generated files.
- The web app keeps working exactly as before; the shell loads the hosted
  production build, so web fixes reach the app without a new archive. Only
  native changes (plugins, icons, capabilities) need a re-archive.
