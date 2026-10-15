"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, SectionTitle } from "@/components/ui";
import { getPromoState, loadTrial, startLaunchTrial, TrialRecord } from "@/lib/promo";
import { useApp } from "@/lib/store";
import {
  currentProductInfo, isNativeShell, purchasePro, refreshProStatus, restorePro, type ProProductInfo,
} from "@/lib/purchases";

const FREE_FEATURES = [
  "Full ATS score + breakdown",
  "ATS simulator (see what the robot reads)",
  "Keyword match preview",
  "Resume builder + file upload",
  "All 9 design templates with live previews",
];
// RR-29: this list, the store listing, and the support FAQ tell the
// same story — templates are FREE; the paid export element is PDF &
// DOCX export. In the app these Pro features are gated behind the
// subscription (RR-26); the web build runs unlocked as the demo.
const PAID_FEATURES = [
  "Everything in Free",
  "Unlimited bullet rewrites",
  "Job posting tailoring",
  "Cover letter generator (3 tones)",
  "LinkedIn profile builder",
  "Career roadmaps (2/5/10-year checkpoints)",
  "Job alerts — new postings scored against your resume",
  "PDF & DOCX export",
];

interface ProviderStatus {
  idme: boolean;
  sheerid: boolean;
  available?: boolean;
}

function PaywallInner() {
  const params = useSearchParams();
  const [note, setNote] = useState("");
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  // RR-01: in the native (iOS) shell this page sells the real subscription
  // via StoreKit; on web it keeps the honest unlocked placeholder below.
  const { proStatus } = useApp();
  const [native, setNative] = useState(false);
  const [prodInfo, setProdInfo] = useState<ProProductInfo | null>(null);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [shopNote, setShopNote] = useState("");

  // Military verification is NOT available in v1 (post-launch update, once
  // SheerID/ID.me are really integrated). This page never grants a military
  // trial: no attestation path, and ?trial= query params are informational
  // only — they cannot activate anything.
  const [verifyNote, setVerifyNote] = useState("");
  const [promoActive, setPromoActive] = useState(false);
  const [promoDaysLeft, setPromoDaysLeft] = useState(0);
  const [launchTrial, setLaunchTrial] = useState<TrialRecord | null>(null);

  useEffect(() => {
    fetch("/api/verify/status")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => setProviders({ idme: false, sheerid: false }));

    // Launch promo: live for 30 days after NEXT_PUBLIC_LAUNCH_DATE.
    // ?promo=preview forces it on for demo purposes.
    const preview = params.get("promo") === "preview";
    const promo = preview
      ? { active: true, daysLeft: 30, trialDays: 14 as const }
      : getPromoState(new Date());
    setPromoActive(promo.active);
    setPromoDaysLeft(promo.daysLeft);

    // Only the launch promo is honored from local storage in v1. Any older
    // military-trial record (e.g. from the removed attestation demo) is
    // ignored — it does not unlock or display anything.
    const saved = loadTrial();
    if (saved && saved.provider === "launch-promo") {
      setLaunchTrial(saved);
    }

    const trial = params.get("trial");
    if (trial === "failed") {
      setVerifyNote("Verification didn't complete. Military verification arrives in a post-launch update — nothing was activated.");
    } else if (trial === "unavailable" || trial === "error" || trial === "verified") {
      // "verified" is deliberately NOT honored here: in v1 no flow can grant
      // a military trial, so a hand-crafted link must not activate one.
      setVerifyNote("Military verification isn't available yet — the 6-month free offer arrives in a post-launch update, once SheerID/ID.me verification is live.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choosePaid() {
    setNote("Paid subscriptions will be purchasable here via Apple In-App Purchase when ResumeRoadmap ships on the App Store. In this web build everything is unlocked — enjoy the full tour.");
  }

  // RR-01: detect the native shell once, then keep the store product's
  // display info fresh as entitlement events arrive.
  useEffect(() => {
    if (isNativeShell()) {
      setNative(true);
      setProdInfo(currentProductInfo());
    }
  }, []);

  useEffect(() => {
    if (native) setProdInfo(currentProductInfo());
  }, [native, proStatus]);

  async function buyPro() {
    setBuying(true);
    setShopNote("");
    const r = await purchasePro();
    setBuying(false);
    if (!r.ok) setShopNote(r.message);
  }

  async function doRestore() {
    setRestoring(true);
    setShopNote("");
    const r = await restorePro();
    setRestoring(false);
    setShopNote(r.message);
  }

  // RR-27: retry for the "unknown" entitlement state — re-checks with
  // the store (re-running initialization if it never completed) instead
  // of dropping the user into a live buy UI on an unconfirmed status.
  async function doRetry() {
    setRetrying(true);
    setShopNote("");
    await refreshProStatus();
    setRetrying(false);
  }

  function startPromoTrial() {
    const t = startLaunchTrial();
    setLaunchTrial(t);
  }

  const anyProvider = !!(providers?.idme || providers?.sheerid);

  return (
    <div>
      <SectionTitle sub="Free forever for the basics. One simple price for everything else.">
        Pricing
      </SectionTitle>

      {note && (
        <Card className="mb-4 border-brand/40 bg-mint">
          <p className="text-sm text-ink">{note}</p>
        </Card>
      )}

      <div className="grid gap-3">
        {!native && promoActive && !launchTrial && (
          <Card className="!border-2 !border-brand !bg-mint">
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide bg-emerald-700 text-white rounded-full px-3 py-1 mb-2">
              🚀 Launch special
            </span>
            <p className="text-lg font-extrabold text-navy mb-1">Try everything free for 2 weeks</p>
            <p className="text-sm text-ink/70 leading-relaxed mb-4">
              For our first {promoDaysLeft} day{promoDaysLeft === 1 ? "" : "s"}, every new user gets the full paid
              tier free for 14 days. No card required — keep it for $25/yr after, or drop to Free.
            </p>
            <Button variant="emerald" onClick={startPromoTrial} className="w-full !min-h-[52px]">
              Start my 2-week free trial
            </Button>
          </Card>
        )}
        {!native && promoActive && launchTrial && (
          <Card className="!border-2 !border-brand !bg-mint">
            <p className="font-extrabold text-navy mb-1">✓ Launch trial active</p>
            <p className="text-sm text-ink/70 leading-relaxed">
              Full paid tier free until{" "}
              {launchTrial.expiresAt ? new Date(launchTrial.expiresAt).toLocaleDateString() : "soon"}
              . After that, keep it for $25/yr or drop to Free.
            </p>
          </Card>
        )}
        <Card>
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-lg font-extrabold text-navy">Free</p>
            <p className="text-right">
              <span className="text-2xl font-extrabold text-navy">$0</span>
              <span className="block text-[11px] text-muted">forever</span>
            </p>
          </div>
          <ul className="my-3 space-y-1.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="text-sm text-ink flex gap-2"><span className="text-emerald-700 font-bold">✓</span>{f}</li>
            ))}
          </ul>
          <Button variant="secondary" className="w-full" disabled>Current plan</Button>
        </Card>

        <Card className="!border-2 !border-brand">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide bg-emerald-700 text-white rounded-full px-3 py-1 mb-2">
            All the bells and whistles
          </span>
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-lg font-extrabold text-navy">Paid</p>
            <p className="text-right">
              <span className="text-2xl font-extrabold text-navy">{native && proStatus === "unknown" ? "—" : native && prodInfo?.price ? prodInfo.price : "$25"}</span>
              <span className="block text-[11px] text-muted">per year</span>
            </p>
          </div>
          <ul className="my-3 space-y-1.5">
            {PAID_FEATURES.map((f) => (
              <li key={f} className="text-sm text-ink flex gap-2"><span className="text-emerald-700 font-bold">✓</span>{f}</li>
            ))}
          </ul>
          {!native ? (
            <Button variant="emerald" onClick={choosePaid} className="w-full !min-h-[52px]">
              Unlock everything — $25/yr
            </Button>
          ) : proStatus === "pro" ? (
            <div>
              <div className="rounded-xl bg-mint border border-brand/40 p-4 mb-2">
                <p className="font-extrabold text-navy">✓ Pro is active</p>
                <p className="text-sm text-ink/70 leading-relaxed">
                  Thanks for subscribing. Manage or cancel anytime in Settings → Apple ID → Subscriptions.
                </p>
              </div>
              <Button variant="secondary" onClick={doRestore} disabled={restoring} className="w-full">
                {restoring ? "Restoring…" : "Restore purchases"}
              </Button>
            </div>
          ) : proStatus === "unknown" ? (
            // RR-27: entitlement not confirmed (plugin absent, product
            // not yet in App Store Connect, or initialization failed —
            // the first-native-build state). Show a checking/retry state
            // with NO price and NO buy action; the purchase branch below
            // is for a confirmed "free" status only.
            <div>
              <div className="rounded-xl bg-mint border border-brand/40 p-4 mb-2">
                <p className="font-extrabold text-navy">Checking your subscription status…</p>
                <p className="text-sm text-ink/70 leading-relaxed">
                  We couldn&apos;t confirm your Pro status with the App Store just now. If you&apos;ve
                  already subscribed, tap Check again — or restore your purchase below.
                </p>
              </div>
              <Button variant="emerald" onClick={doRetry} disabled={retrying} className="w-full !min-h-[52px]">
                {retrying ? "Checking…" : "Check again"}
              </Button>
              <Button variant="secondary" onClick={doRestore} disabled={restoring} className="w-full mt-2">
                {restoring ? "Restoring…" : "Restore purchases"}
              </Button>
            </div>
          ) : (
            <div>
              <Button variant="emerald" onClick={buyPro} disabled={buying} className="w-full !min-h-[52px]">
                {buying ? "Processing…" : `Unlock everything — ${prodInfo?.price || "$25"}/yr`}
              </Button>
              {prodInfo?.trialNote && (
                <p className="text-xs text-muted leading-relaxed mt-2">{prodInfo.trialNote}</p>
              )}
              <Button variant="secondary" onClick={doRestore} disabled={restoring} className="w-full mt-2">
                {restoring ? "Restoring…" : "Restore purchases"}
              </Button>
            </div>
          )}
          {native && shopNote && (
            <p className="text-sm text-ink/80 leading-relaxed mt-3">{shopNote}</p>
          )}
        </Card>

        <Card className="!bg-navy !border-navy text-white">
          <p className="font-extrabold mb-1">🎖 Military: 6 months free</p>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Currently serving or served? The full paid tier will be free for 6 months — no card required.
          </p>

          {verifyNote && <p className="text-sm text-amber-300 mb-3">{verifyNote}</p>}

          {providers === null && (
            <p className="text-sm text-white/60">Checking verification options…</p>
          )}

          {providers !== null && anyProvider ? (
            <div className="grid gap-2">
              {providers.idme && (
                <a href="/api/verify/idme/start"
                  className="flex items-center justify-center gap-2 rounded-[14px] bg-white text-navy font-bold min-h-[52px] px-5 text-[15px] active:scale-[0.98] transition">
                  <span className="w-6 h-6 rounded-md bg-[#0A66C2] text-white text-xs font-extrabold flex items-center justify-center">id</span>
                  Verify with ID.me
                </a>
              )}
              {providers.sheerid && (
                <a href="/api/verify/sheerid/start"
                  className="flex items-center justify-center gap-2 rounded-[14px] bg-cta text-white font-bold min-h-[52px] px-5 text-[15px] active:scale-[0.98] transition">
                  ✓ Verify with SheerID
                </a>
              )}
            </div>
          ) : providers !== null ? (
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-bold text-white mb-1">Coming in a post-launch update</p>
              <p className="text-sm text-white/70 leading-relaxed">
                We're finishing secure verification with SheerID and ID.me. Until that's live, the military
                offer can't be claimed in this version — there's no sign-up form or self-declaration here,
                because we won't grant it on anything less than real verification.
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="mt-4">
        {native ? (
          <p className="text-xs text-muted leading-relaxed">
            <b className="text-ink">iOS build:</b> Pro is an auto-renewable subscription billed by Apple
            through your Apple ID. Restore Purchases re-activates it on any device signed into the same
            Apple ID. The 2-week launch trial is the subscription&apos;s introductory offer in App Store Connect.
          </p>
        ) : (
          <p className="text-xs text-muted leading-relaxed">
            <b className="text-ink">Web build note:</b> payments aren&apos;t wired up here — in the iOS build,
            Pro is purchased through Apple In-App Purchase on this same page. Nothing is gated in this build.
          </p>
        )}
      </Card>

      <Link href="/" className="flex items-center justify-center min-h-[44px] mt-4">
        <span className="text-sm text-emerald-700 font-bold underline">← Back to home</span>
      </Link>
    </div>
  );
}

export default function PaywallPage() {
  return (
    <Suspense fallback={<p className="text-muted text-sm">Loading…</p>}>
      <PaywallInner />
    </Suspense>
  );
}
