"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, Field, SectionTitle, inputCls } from "@/components/ui";
import { getPromoState, loadTrial, saveTrial, startLaunchTrial, TrialRecord } from "@/lib/promo";

const FREE_FEATURES = ["Full ATS score + breakdown", "ATS simulator (see what the robot reads)", "Keyword match preview"];
const PAID_FEATURES = [
  "Everything in Free",
  "Unlimited bullet rewrites",
  "Job posting tailoring",
  "Cover letter generator (3 tones)",
  "LinkedIn profile builder",
  "All 5 design templates + PDF export",
];

interface ProviderStatus {
  idme: boolean;
  sheerid: boolean;
}

function PaywallInner() {
  const params = useSearchParams();
  const [note, setNote] = useState("");
  const [providers, setProviders] = useState<ProviderStatus | null>(null);

  // Attestation fallback (used when no provider keys are configured)
  const [attested, setAttested] = useState(false);
  const [milEmail, setMilEmail] = useState("");
  const [showAttestation, setShowAttestation] = useState(false);

  const [trialActive, setTrialActive] = useState(false);
  const [trialProvider, setTrialProvider] = useState<string | null>(null);
  const [trialError, setTrialError] = useState("");
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

    // Trial already activated in this browser?
    const saved = loadTrial();
    if (saved) {
      if (saved.provider === "launch-promo") {
        setLaunchTrial(saved);
      } else {
        setTrialActive(true);
        setTrialProvider(saved.provider ?? null);
      }
    }

    const trial = params.get("trial");
    if (trial === "verified") {
      const provider = params.get("provider") ?? "verified";
      setTrialActive(true);
      setTrialProvider(provider);
      saveTrial({ active: true, provider, at: new Date().toISOString() });
    } else if (trial === "failed") {
      setTrialError(params.get("reason") || "Verification didn't complete. You can retry or use attestation below.");
    } else if (trial === "unavailable" || trial === "error") {
      setTrialError("Verification is temporarily unavailable. Please use attestation below.");
      setShowAttestation(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choosePaid() {
    setNote("Paid subscriptions will be purchasable here via Apple In-App Purchase when HireCraft ships on the App Store. In this web build everything is unlocked — enjoy the full tour.");
  }

  function startAttestation() {
    if (!attested) {
      setTrialError("Please confirm your service with the checkbox above.");
      return;
    }
    if (milEmail && !/\.mil$/i.test(milEmail.trim())) {
      setTrialError("That doesn't look like a .mil address — it's optional, so you can leave it blank.");
      return;
    }
    setTrialError("");
    setTrialActive(true);
    setTrialProvider("attestation (demo)");
    saveTrial({ active: true, provider: "attestation", at: new Date().toISOString() });
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
        {promoActive && !launchTrial && (
          <Card className="!border-2 !border-brand !bg-mint">
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide bg-brand text-white rounded-full px-3 py-1 mb-2">
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
        {promoActive && launchTrial && (
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
              <li key={f} className="text-sm text-ink flex gap-2"><span className="text-brand font-bold">✓</span>{f}</li>
            ))}
          </ul>
          <Button variant="secondary" className="w-full" disabled>Current plan</Button>
        </Card>

        <Card className="!border-2 !border-brand">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide bg-brand text-white rounded-full px-3 py-1 mb-2">
            All the bells and whistles
          </span>
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-lg font-extrabold text-navy">Paid</p>
            <p className="text-right">
              <span className="text-2xl font-extrabold text-navy">$25</span>
              <span className="block text-[11px] text-muted">per year</span>
            </p>
          </div>
          <ul className="my-3 space-y-1.5">
            {PAID_FEATURES.map((f) => (
              <li key={f} className="text-sm text-ink flex gap-2"><span className="text-brand font-bold">✓</span>{f}</li>
            ))}
          </ul>
          <Button variant="emerald" onClick={choosePaid} className="w-full !min-h-[52px]">
            Unlock everything — $25/yr
          </Button>
        </Card>

        <Card className="!bg-navy !border-navy text-white">
          <p className="font-extrabold mb-1">🎖 Military: 6 months free</p>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Currently serving or served? Get the full paid tier free for 6 months — permanent, not a launch gimmick. No card required.
          </p>

          {trialActive ? (
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-bold text-white mb-1">✓ Trial activated</p>
              <p className="text-sm text-white/70 leading-relaxed">
                {trialProvider === "attestation (demo)" || trialProvider === "attestation"
                  ? "Your 6-month military trial is active in this build (attestation demo). At App Store launch, service is verified securely via SheerID/ID.me."
                  : `Verified via ${trialProvider === "idme" ? "ID.me" : trialProvider === "sheerid" ? "SheerID" : trialProvider}. Your 6-month trial is active.`}
              </p>
            </div>
          ) : (
            <>
              {trialError && <p className="text-sm text-amber-300 mb-3">{trialError}</p>}

              {providers === null && (
                <p className="text-sm text-white/60 mb-3">Checking verification options…</p>
              )}

              {providers !== null && anyProvider && (
                <div className="grid gap-2 mb-2">
                  {providers.idme && (
                    <a href="/api/verify/idme/start"
                      className="flex items-center justify-center gap-2 rounded-[14px] bg-white text-navy font-bold min-h-[52px] px-5 text-[15px] active:scale-[0.98] transition">
                      <span className="w-6 h-6 rounded-md bg-[#0A66C2] text-white text-xs font-extrabold flex items-center justify-center">id</span>
                      Verify with ID.me
                    </a>
                  )}
                  {providers.sheerid && (
                    <a href="/api/verify/sheerid/start"
                      className="flex items-center justify-center gap-2 rounded-[14px] bg-brand text-white font-bold min-h-[52px] px-5 text-[15px] active:scale-[0.98] transition">
                      ✓ Verify with SheerID
                    </a>
                  )}
                  <button onClick={() => setShowAttestation(!showAttestation)}
                    className="text-xs text-white/60 underline min-h-[44px]">
                    {showAttestation ? "hide attestation option" : "or continue with attestation instead"}
                  </button>
                </div>
              )}

              {(!anyProvider || showAttestation) && providers !== null && (
                <div className={anyProvider ? "border-t border-white/15 pt-4 mt-2" : ""}>
                  {!anyProvider && (
                    <p className="text-xs text-white/50 mb-3">
                      Instant verification isn't configured in this build — claim with attestation below.
                    </p>
                  )}
                  <label className="flex gap-3 items-start mb-3 cursor-pointer min-h-[44px]">
                    <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-[#10B981]" />
                    <span className="text-sm text-white/85">
                      I confirm I am currently serving or have served in the U.S. Armed Forces.
                    </span>
                  </label>
                  <Field label=" " hint="Optional — helps us verify faster at launch.">
                    <input value={milEmail} onChange={(e) => setMilEmail(e.target.value)} inputMode="email"
                      placeholder="you@mail.mil (optional)"
                      className={`${inputCls} !bg-white/10 !border-white/20 !text-white placeholder:!text-white/40`} />
                  </Field>
                  <Button variant="emerald" onClick={startAttestation} className="w-full">
                    Start my 6-month free trial
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <p className="text-xs text-muted leading-relaxed">
          <b className="text-ink">Web build note:</b> payments aren't wired up here — Apple In-App Purchase lands at the App Store packaging step (see README). Nothing is gated in this build.
        </p>
      </Card>

      <Link href="/" className="block text-center mt-4">
        <span className="text-sm text-brand font-bold underline">← Back to home</span>
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
