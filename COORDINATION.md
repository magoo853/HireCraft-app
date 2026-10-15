# COORDINATION.md — Two-Builder Shared State

**Product:** ResumeRoadmap (repo: `magoo853/HireCraft-app`)
**Production:** https://hirecraft-app-steel.vercel.app
**Last updated:** 2026-10-15 by Jarvis (RR-26/29 landed — see claims)

This file is the repo-visible source of truth for two AI builders working the
same codebase. Read it at the start of every session. Update it at the end.

## Who does what

- **James (owner)** — makes every product, pricing, naming, and policy
  decision. Approves anything user-facing before it ships.
- **Jarvis (Muse)** — system of record. Owns the findings register and
  improvement log (they live in Jarvis's workspace; this file is their
  repo-visible mirror). Owns verification: nothing is "done" until Jarvis
  has read it back on `main` and verified it in production.
- **Perplexity** — research, second-opinion code review, and isolated
  drafts (see `PERPLEXITY_BRIEF.md`). Perplexity does not commit directly
  and does not decide product policy, pricing, or names. Its output enters
  the repo through the normal path: commit → read-back → production verify.

## Session protocol

**START:** read this file → pull latest `main` → check the claims table
below. If the file or area you need is claimed, work something else or ask
James — never edit on top of another builder's claim.

**CLAIM before touching:** add a row to the claims table (item, builder,
files, date) and commit that claim before starting the work itself.

**END:** update the state section + claims table (release your rows), then
commit. A session that doesn't update this file didn't happen.

## Write discipline (hard rules — each one comes from a real failure)

1. **One writer per file at a time.** Claims are exclusive.
2. **Single-commit pushes.** The push API creates one commit per call.
   Never split a change so an intermediate tree breaks the build; if a
   change must be batched, order it so every prefix builds.
3. **Never push overlapping file sets in parallel calls.** They can land
   out of order and silently revert each other.
4. **Read back after every push.** Fetch the file from `main` and confirm
   its content (blob SHA) before calling anything landed. A timed-out push
   may still have landed — verify remote state before re-pushing.
5. **"Done" means production-verified.** Local builds and typechecks prove
   nothing about the deployed app. Verify at the production URL.
6. **If a push hangs or a write is refused as "already running," STOP.**
   Read back the remote state. Never blind re-push, and never route around
   an approval prompt — surface it to James.

## Project invariants (never change without James)

- **Name:** ResumeRoadmap. Internal identifiers do NOT follow the name:
  repo `HireCraft-app`, bundle ID `com.hirecraft.app`, localStorage key
  `hirecraft-state-v1`, StoreKit product `hirecraft_pro_yearly`, group
  "ResumeRoadmap Pro".
- **Palette:** pine `#0B3B2E` · brand `#10B981` · mint `#ECFDF5` ·
  ink `#0B1220` · CTA `#047857`.
- **Pricing:** free tier = basic ATS scan/score. One paid tier: **$25/year,
  all features**. Military offer (6 months free via SheerID/ID.me) arrives
  **post-launch** — never present it as live in v1.
- **Privacy:** PII redaction (`lib/redact.ts`) stays in front of every AI
  call, client and server. Fail-closed: if redaction can't run, the AI
  call doesn't happen.
- **AI drafts, humans decide.** AI output is a draft the user reviews and
  edits; it is never applied silently.
- **Resume output targets two pages.** Controlled formatting; users
  customize content, not layout chaos.

## Current state — 2026-10-15

**Findings register: 31 of 39 closed (Critical 1/2 · High 1/3 · Medium 7/9 ·
Low 22/25).** FEATURE FREEZE in force: the register is the only queue.
Features reopen only at zero Critical/High + one clean re-audit pass.

| Item | Sev | What | Owner / status |
|---|---|---|---|
| RR-26 | High | Native builds didn't gate "Paid" features behind Pro status (Guideline 3.1.1 exposure). | **CLOSED 2026-10-15** — James chose option A; gate shipped (commit `d57a33a6…`, production-verified on web; native-side proof completes at the Mac session sandbox test). |
| RR-29 | Med | Template entitlement wording inconsistent across listing/FAQ/paywall. | **CLOSED 2026-10-15** — one story everywhere: templates free; Pro = rewrites, tailoring, cover letters, LinkedIn, roadmaps, job alerts, PDF & DOCX export. |
| RR-02 | Crit | Gemini paid tier unverified (free tier lets Google train on submissions). | James verifies in Google console. |
| RR-03 | High | Apple Developer enrollment + Paid Apps Agreement status unverified. | James verifies in Apple portals. |
| RR-04 | High | Domain `resumeroadmap.app` unregistered; attorney clearance of the name pending. | James / external. |
| RR-06 | Med | `privacy@hirecraft.app` mailbox receives mail; mailbox-vs-catch-all needs one admin glance. | James. |
| RR-08 | Med | Adzuna + USAJobs API keys not yet in Vercel env (code side done; Discover degrades gracefully). | James adds keys + redeploy. |
| RR-19 | Low | `package-lock.json` not committed; regenerates free via `npm install` at the Mac session. | Mac session. |
| RR-23 | Low | Vercel Web Analytics + Speed Insights toggle state unverified **on the for-profit project**. ⚠️ A namesake `hirecraft-app` project exists under the Code Red team and was never deployed — checking that one proves nothing. | James, for-profit team project only. |
| RR-22 | Low | Two-column PDF banner placement. | Scoped out — leave as-is (redesign-class fix; parser regression risk documented in the register). |

**Mac session remainder** (guided, on James's Mac, ~1–2 hrs):
`npm install` (also lands RR-19) → `npx cap sync ios` → install iOS assets →
Xcode: enable In-App Purchase capability → create `hirecraft_pro_yearly` +
launch intro offer in App Store Connect → archive → upload → sandbox
purchase test (RR-26 gating shipped 2026-10-15 — the sandbox test now
also proves the gate: a free sandbox account sees Pro prompts on the
paid surfaces; after purchase they open).

## Claims

| Item / area | Builder | Files | Since |
|---|---|---|---|
| Findings register, improvement log, verification lane | Jarvis | (Jarvis workspace — register + log) | standing |
| RR-26 + RR-29 implementation (native Pro gate + copy alignment) | Jarvis | lib/pro-gate.ts, components/pro-gate.tsx, app/{rewrite,roadmap,cover,linkedin,discover,design,paywall,support}, APP_STORE_LISTING.md, README.md, COORDINATION.md | 2026-10-15 — **completed, released** (commit `d57a33a6…` + docs commit; production-verified) |
| — none claimed — | Perplexity | — | — |

## Build behavior

Vercel builds are gated by `ignoreCommand` in `vercel.json`, which runs `scripts/vercel-ignore.sh`: a deployment is **skipped** only when every file it changes is documentation (any `*.md` file, or anything under `docs/`). Any code, config, asset, or lockfile change — and any diff the script cannot determine — **builds** (fail-safe). Verified 2026-10-15 by production build IDs: the config commit built, this docs-only note's commit was skipped, and a following code commit built again. The script is plain POSIX sh and unit-tested against synthetic git ranges; editing it counts as a code change and triggers a build.
