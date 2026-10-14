# ResumeRoadmap — James Action Packet

Account-owner actions only. Work top to bottom; items 1–3 harden the live service, item 4 is post-launch, item 5 is the remaining native-launch step.

## 1. Google AI Studio / Gemini — billing & paid tier

- [ ] In Google AI Studio, open the **HireCraft** project (the one the production key belongs to).
- [ ] Link a billing account to that project and confirm the project shows as **paid tier** (not free tier).
- [ ] In Google Cloud Billing for that account, set a **budget alert at $50** so spend is visible before it grows.
- [ ] Leave the existing `AI_API_KEY` in Vercel as-is — no new key is needed for this step.
- Why: the free tier carries tighter rate limits, and Google's free-tier terms allow submitted content to be used to improve its products. Paid tier removes both concerns — that's why the upgrade matters for a product that processes resumes.

## 2. USAJobs — developer registration

- [ ] Register for a USAJobs developer API key using your account email.
- [ ] In Vercel → `hirecraft-app` → Settings → Environment Variables, add:
  - `USAJOBS_API_KEY` = the key from registration
  - `USAJOBS_EMAIL` = the email address the key is registered to
- [ ] Redeploy the project (Deployments → latest → Redeploy) so the new variables take effect — until then, USAJobs results simply stay off in job alerts.

## 3. privacy@hirecraft.app — mailbox check

- [ ] Confirm the `privacy@hirecraft.app` mailbox actually exists in the mail host for the domain (it is the published contact in the privacy policy, listing, and support page).
- [ ] Send a test message **to** it from a personal address and confirm it arrives.
- [ ] Reply to the test so sending is confirmed too — App Store review and users will write to this address.

## 4. SheerID & ID.me — POST-LAUNCH (not a v1 gate)

- [ ] **Skip for launch.** These are for the 6-month military trial in a post-launch update only.
- [ ] When ready: create a SheerID developer account and an ID.me developer app for ResumeRoadmap.
- [ ] Send the resulting credentials to be wired into the app as an update — the v1 launch does not wait on this.

## 5. App Store Connect & Mac session

- [ ] In App Store Connect → Agreements, Tax, and Banking, confirm the **Paid Apps Agreement reads "Active"** (banking + W-9 were submitted Oct 12 and showed "Processing" — it must be Active before the $25/year subscription can be sold).
- [ ] Keep the **Mac/Xcode session** as the remaining native step: run the setup commands in Terminal, open the workspace in Xcode, set signing, archive, and upload to TestFlight (full sequence is in `MAC_BUILD_RUNBOOK.md`).

---

Nothing on this page involves code changes — each item is an account, billing, mailbox, or console step only the account owner can do.
