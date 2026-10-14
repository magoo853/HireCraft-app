"use client";

import Link from "next/link";
import { useApp } from "../lib/store";
import { allStepsDone, gettingStartedSteps } from "../lib/getting-started";
import { Card } from "./ui";

/**
 * "Getting started" progress card for the Resume tab. Steps are derived
 * from real store signals only (see lib/getting-started.ts) — a step is
 * never shown done without the action actually having happened. While
 * any step is incomplete the checklist shows; when all are done it
 * swaps to a one-line all-set state. The × dismisses permanently
 * (persisted via the additive onboardingDismissed store flag).
 */
export function GettingStartedCard() {
  const {
    hasResume, jobText,
    scoreViewed, rewriteAccepted, designChosen, exported,
    onboardingDismissed, setOnboardingDismissed, versions,
  } = useApp();

  if (onboardingDismissed) return null;

  const steps = gettingStartedSteps({
    hasResume,
    hasTargetJob: jobText.trim().length > 0,
    scoreViewed,
    rewriteAccepted,
    designChosen,
    exported,
    trackedApplication: versions.some((v) => !!v.application),
  });
  const doneCount = steps.filter((s) => s.done).length;

  const dismiss = (
    <button
      type="button"
      onClick={() => setOnboardingDismissed(true)}
      aria-label="Dismiss the getting started checklist"
      className="shrink-0 w-11 h-11 -mr-2 -mt-2 inline-flex items-center justify-center rounded-full text-muted text-xl leading-none"
    >
      ×
    </button>
  );

  if (allStepsDone(steps)) {
    return (
      <Card className="mb-5 border-brand/40 print:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-emerald-900">
            🎉 You&apos;re all set — your resume has been scored, improved, designed, and exported.
          </p>
          {dismiss}
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-5 print:hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-extrabold text-navy text-[15px]">Getting started</p>
          <p className="text-xs text-muted mt-0.5">
            {doneCount} of {steps.length} done — the path to a job-ready resume.
          </p>
        </div>
        {dismiss}
      </div>
      <ol className="mt-2">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={`flex items-center gap-3 min-h-[44px] px-2 -mx-2 rounded-xl ${
                s.state === "next" ? "bg-mint" : ""
              }`}
            >
              {s.done ? (
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                  ✓
                </span>
              ) : (
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0 ${
                    s.state === "next"
                      ? "border-2 border-emerald-700 text-emerald-700"
                      : "border-2 border-line text-muted"
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span
                className={`text-sm ${
                  s.done
                    ? "font-semibold text-ink"
                    : s.state === "next"
                      ? "font-extrabold text-navy"
                      : "font-semibold text-muted"
                }`}
              >
                {s.label}
              </span>
              {s.state === "next" && (
                <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wide bg-emerald-700 text-white px-2 py-1 rounded-full shrink-0">
                  Up next
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
