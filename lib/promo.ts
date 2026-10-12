/**
 * Launch promo: for the first 30 days after LAUNCH_DATE, every new user gets
 * a free 14-day trial of the paid tier. The military 6-month trial is permanent
 * and unaffected.
 *
 * Config: NEXT_PUBLIC_LAUNCH_DATE (ISO date, e.g. "2026-11-01").
 * Unset or invalid -> no promo (safe default).
 */

export interface PromoState {
  active: boolean;
  daysLeft: number; // days remaining in the 30-day promo window
  trialDays: 14;
}

const PROMO_WINDOW_DAYS = 30;
const TRIAL_DAYS = 14;

export function getPromoState(now: Date = new Date(), launchDateStr?: string): PromoState {
  const inactive: PromoState = { active: false, daysLeft: 0, trialDays: TRIAL_DAYS };
  const raw = launchDateStr ?? process.env.NEXT_PUBLIC_LAUNCH_DATE;
  if (!raw) return inactive;
  const launch = new Date(raw);
  if (isNaN(launch.getTime())) return inactive;

  const start = new Date(launch);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + PROMO_WINDOW_DAYS);

  if (now < start || now > end) return inactive;
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { active: true, daysLeft, trialDays: TRIAL_DAYS };
}

export interface TrialRecord {
  active: boolean;
  provider: string; // "launch-promo" | "idme" | "sheerid" | "attestation"
  at: string;
  expiresAt?: string; // ISO — set for time-boxed trials (launch promo)
}

const KEY = "hirecraft-trial";

export function loadTrial(): TrialRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as TrialRecord;
    if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return t.active ? t : null;
  } catch {
    return null;
  }
}

export function saveTrial(t: TrialRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function startLaunchTrial(): TrialRecord {
  const at = new Date();
  const expiresAt = new Date(at.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const t: TrialRecord = {
    active: true,
    provider: "launch-promo",
    at: at.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  saveTrial(t);
  return t;
}
