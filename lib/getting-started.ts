/**
 * Pure derivation for the Resume tab's "Getting started" checklist
 * (components/getting-started.tsx). No React, no storage — unit-testable.
 *
 * Every `done` comes from a real signal, never a guess:
 * - hasResume / hasTargetJob derive from existing store state (the same
 *   signals hasResume and TargetJobBanner already use).
 * - scoreViewed, rewriteAccepted, designChosen, exported are additive
 *   store flags set at the exact moment the action happens: the Score
 *   tab displaying a computed score, Rewrite's acceptRewrite, the
 *   Design tab's template tap, and the Design tab's export handlers.
 */
export interface ProgressSignals {
  hasResume: boolean;
  hasTargetJob: boolean;
  scoreViewed: boolean;
  rewriteAccepted: boolean;
  designChosen: boolean;
  exported: boolean;
}

export type StepState = "done" | "next" | "upcoming";

export interface GettingStartedStep {
  key: string;
  label: string;
  href: string;
  done: boolean;
  state: StepState;
}

const STEP_DEFS: { key: string; label: string; href: string; signal: keyof ProgressSignals }[] = [
  { key: "resume", label: "Add your resume", href: "/resume", signal: "hasResume" },
  { key: "job", label: "Set a target job", href: "/resume", signal: "hasTargetJob" },
  { key: "score", label: "Check your score", href: "/score", signal: "scoreViewed" },
  { key: "rewrite", label: "Improve your bullets", href: "/rewrite", signal: "rewriteAccepted" },
  { key: "design", label: "Pick a design", href: "/design", signal: "designChosen" },
  { key: "export", label: "Export your resume", href: "/design", signal: "exported" },
];

export function gettingStartedSteps(s: ProgressSignals): GettingStartedStep[] {
  let nextAssigned = false;
  return STEP_DEFS.map((d) => {
    const done = !!s[d.signal];
    let state: StepState = "upcoming";
    if (done) {
      state = "done";
    } else if (!nextAssigned) {
      state = "next";
      nextAssigned = true;
    }
    return { key: d.key, label: d.label, href: d.href, done, state };
  });
}

export function allStepsDone(steps: GettingStartedStep[]): boolean {
  return steps.every((s) => s.done);
}
