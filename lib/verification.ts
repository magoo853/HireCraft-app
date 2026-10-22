/**
 * Military / veteran verification abstraction for the 6-month free trial.
 *
 * Two industry-standard providers, one common interface:
 *  - ID.me   — OAuth 2.0 hosted flow (user verifies at id.me, we read group attributes)
 *  - SheerID — REST v2 hosted verification (server creates verification, user completes on SheerID)
 *
 * Env vars (server-side only):
 *   IDME_CLIENT_ID, IDME_CLIENT_SECRET, IDME_SANDBOX ("true" -> api.idmelabs.com)
 *   SHEERID_API_TOKEN (Bearer token), SHEERID_PROGRAM_ID (military program id)
 *   SHEERID_WEBHOOK_SECRET (account Secret Token from MySheerID — the HMAC key
 *                        for X-SheerID-Signature webhook verification)
 *   NEXT_PUBLIC_APP_URL (public base URL, e.g. https://hirecraft.app — callbacks must be
 *                        registered in the ID.me app dashboard / SheerID program settings)
 *
 * UNCERTAINTIES — confirm before production launch:
 *  1. ID.me attributes.json: the exact group strings returned for military/veteran users
 *     (we match /milit|veteran/i) and whether top-level `verified` covers group affiliation.
 *     Confirm in the ID.me developer dashboard for your approved policy.
 *  2. SheerID GET /rest/v2/verification/{id}: we treat `result === true` as verified.
 *     Confirm the exact completion/result field shape for your program in the SheerID docs.
 *  3. SheerID hosted-form return behavior: after the user finishes on SheerID's page,
 *     the app re-checks status via /api/verify/sheerid/callback (also wired to a
 *     "I've finished — check status" button). If SheerID supports a return redirect
 *     for your program, point it at that callback URL.
 *  4. SheerID webhook contract — RESOLVED 2026-10-21 from SheerID's developer
 *     guide (developer.sheerid.com/tutorials/verifications/webhooks): POSTs
 *     carry a minimal JSON payload { verificationId, notifierEventType } with
 *     no PII, plus an X-SheerID-Signature header — the lowercase hex
 *     HMAC-SHA256 of the RAW body, keyed by the account Secret Token
 *     (SHEERID_WEBHOOK_SECRET). verifySheeridSignature() below implements it;
 *     the webhook treats the event as a signal only and re-checks status
 *     server-side, and it can never grant a trial by itself.
 *
 * V1 LAUNCH STATE — VERIFICATION IS DISABLED (fail closed):
 *  Provider accounts/credentials are not in place and the response contracts
 *  above are unconfirmed, so no flow in v1 may mark a user verified or grant
 *  the military trial. `providerStatus()` reports every provider as
 *  unavailable unless MILITARY_VERIFICATION_ENABLED="true" is set AND that
 *  provider is fully configured. Flip the flag only after the real
 *  SheerID/ID.me integration above is finished and tested end to end.
 *  There is deliberately NO attestation/self-declaration path.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Provider calls must never hang a request path (RR-40 lesson): hard timeout. */
const PROVIDER_TIMEOUT_MS = 10_000;
const providerSignal = () => AbortSignal.timeout(PROVIDER_TIMEOUT_MS);

export type ProviderId = "idme" | "sheerid";

export interface VerificationResult {
  verified: boolean;
  provider: ProviderId;
  detail?: string;
}

/* ------------------------------------------------------------------ */
/* Launch gate                                                         */
/* ------------------------------------------------------------------ */

/**
 * Master switch for military verification. OFF in v1: returns true only when
 * MILITARY_VERIFICATION_ENABLED="true" is set server-side. Even then, a
 * provider is usable only when its own credentials are configured. Every
 * caller (status, start, callback, webhook, paywall) must fail closed when
 * this is false.
 */
export function verificationLive(): boolean {
  return process.env.MILITARY_VERIFICATION_ENABLED === "true";
}

/** True only when verification is live AND this provider is configured. */
export function providerAvailable(provider: ProviderId): boolean {
  if (!verificationLive()) return false;
  return provider === "idme" ? idmeConfigured() : sheeridConfigured();
}

/* ------------------------------------------------------------------ */
/* ID.me                                                               */
/* ------------------------------------------------------------------ */

const idmeHost = () =>
  process.env.IDME_SANDBOX === "true" ? "https://api.idmelabs.com" : "https://api.id.me";

export function idmeConfigured(): boolean {
  return !!(process.env.IDME_CLIENT_ID && process.env.IDME_CLIENT_SECRET);
}

/** Hosted authorize URL. Scope "military" covers the military community (incl. veterans). */
export function idmeAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.IDME_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "military",
    state,
  });
  return `${idmeHost()}/oauth/authorize?${params.toString()}`;
}

/** Exchange the callback code, fetch group attributes, decide eligibility. */
export async function idmeVerify(code: string, redirectUri: string): Promise<VerificationResult> {
  const host = idmeHost();

  const tokenRes = await fetch(`${host}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: providerSignal(),
    body: new URLSearchParams({
      code,
      client_id: process.env.IDME_CLIENT_ID ?? "",
      client_secret: process.env.IDME_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return { verified: false, provider: "idme", detail: `token exchange failed (${tokenRes.status})` };
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return { verified: false, provider: "idme", detail: "no access token returned" };
  }

  const attrRes = await fetch(`${host}/api/public/v3/attributes.json`, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    signal: providerSignal(),
  });
  if (!attrRes.ok) {
    return { verified: false, provider: "idme", detail: `attributes fetch failed (${attrRes.status})` };
  }
  const attrs = (await attrRes.json()) as {
    verified?: boolean;
    groups?: string[];
    group?: string;
    status?: string[];
  };

  const groups = [...(attrs.groups ?? []), ...(attrs.group ? [attrs.group] : []), ...((attrs.status ?? []).map(String))];
  const military = groups.some((g) => /milit|veteran/i.test(g));

  return {
    verified: attrs.verified === true && military,
    provider: "idme",
    detail: military ? `groups: ${groups.join(", ") || "none listed"}` : "no military/veteran group found",
  };
}

/* ------------------------------------------------------------------ */
/* SheerID                                                             */
/* ------------------------------------------------------------------ */

const SHEER_API = "https://services.sheerid.com";

export function sheeridConfigured(): boolean {
  return !!(process.env.SHEERID_API_TOKEN && process.env.SHEERID_PROGRAM_ID);
}

/**
 * Create a verification server-side (abuse-resistant per SheerID docs) and hand
 * the user the hosted form URL.
 */
export async function sheeridCreateVerification(): Promise<{ verificationId: string; hostedUrl: string }> {
  const programId = process.env.SHEERID_PROGRAM_ID ?? "";
  const res = await fetch(`${SHEER_API}/rest/v2/verification`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SHEERID_API_TOKEN ?? ""}`,
      "Content-Type": "application/json",
    },
    signal: providerSignal(),
    body: JSON.stringify({ programId }),
  });
  if (!res.ok) throw new Error(`SheerID verification creation failed (${res.status})`);
  const json = (await res.json()) as { verificationId: string };
  if (!json.verificationId) throw new Error("SheerID did not return a verificationId");
  return {
    verificationId: json.verificationId,
    hostedUrl: `${SHEER_API}/verify/${programId}/?verificationId=${json.verificationId}`,
  };
}

/** Poll a verification's status. `result === true` means the user verified. */
export async function sheeridCheckStatus(verificationId: string): Promise<VerificationResult> {
  const res = await fetch(`${SHEER_API}/rest/v2/verification/${verificationId}`, {
    headers: { Authorization: `Bearer ${process.env.SHEERID_API_TOKEN ?? ""}` },
    signal: providerSignal(),
  });
  if (!res.ok) {
    return { verified: false, provider: "sheerid", detail: `status check failed (${res.status})` };
  }
  const json = (await res.json()) as { result?: boolean; currentStep?: string };
  return {
    verified: json.result === true,
    provider: "sheerid",
    detail: json.result === true ? "verified" : `current step: ${json.currentStep ?? "unknown"}`,
  };
}

/* ------------------------------------------------------------------ */
/* SheerID webhook signature                                           */
/* ------------------------------------------------------------------ */

/** The account Secret Token (MySheerID → API Access) that keys webhook HMACs. */
export function sheeridWebhookSecret(): string | undefined {
  return process.env.SHEERID_WEBHOOK_SECRET || undefined;
}

/**
 * Verify an X-SheerID-Signature header per SheerID's webhook guide: the
 * signature is the lowercase hex HMAC-SHA256 digest of the RAW request body
 * (never re-serialized JSON), keyed by the account Secret Token. Compared in
 * constant time. Fails closed: no configured secret, a missing header, or any
 * mismatch returns false.
 */
export function verifySheeridSignature(
  rawBody: string,
  signature: string | null | undefined
): boolean {
  const secret = sheeridWebhookSecret();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * What the paywall may offer. In v1 this is always
 * { idme: false, sheerid: false, available: false } — providers report
 * available only when verification is live AND configured (see launch gate).
 */
export function providerStatus(): Record<ProviderId, boolean> & { available: boolean } {
  return {
    idme: providerAvailable("idme"),
    sheerid: providerAvailable("sheerid"),
    available: verificationLive() && (idmeConfigured() || sheeridConfigured()),
  };
}

export function randomState(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "");
}
