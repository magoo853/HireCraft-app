import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ProviderId,
  appBaseUrl,
  idmeVerify,
  providerAvailable,
  sheeridCheckStatus,
} from "@/lib/verification";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/verify/:provider/callback
 * Handles the return from the hosted flow and decides the trial.
 *  - idme:    validates state, exchanges code, reads group attributes.
 *  - sheerid: polls the verification created at /start (also used by the
 *             paywall's "I've finished — check status" button).
 *
 * On success: sets the hirecraft_trial cookie and redirects to /paywall?trial=verified.
 * Otherwise: redirects to /paywall?trial=failed.
 *
 * FAIL-CLOSED IN V1: while verification is disabled (launch gate in
 * lib/verification.ts) or the provider is unconfigured, this NEVER grants —
 * no cookie is set and the user lands on /paywall?trial=unavailable. A
 * hand-crafted callback therefore cannot mint a trial.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as ProviderId;
  const base = appBaseUrl(); // registered callback base (must match ID.me dashboard)
  const origin = new URL(req.url).origin; // where the user actually is
  const jar = cookies();

  if (provider !== "idme" && provider !== "sheerid") {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  // Launch gate: disabled or unconfigured providers can never grant a trial.
  if (!providerAvailable(provider)) {
    jar.delete("idme_state");
    jar.delete("sheerid_vid");
    return NextResponse.redirect(`${origin}/paywall?trial=unavailable`);
  }

  const grant = () => {
    jar.set("hirecraft_trial", JSON.stringify({ provider, verified: true, at: new Date().toISOString() }), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 180, // 6 months
      sameSite: "lax",
    });
    return NextResponse.redirect(`${origin}/paywall?trial=verified&provider=${provider}`);
  };
  const deny = (reason: string) =>
    NextResponse.redirect(`${origin}/paywall?trial=failed&reason=${encodeURIComponent(reason)}`);

  if (provider === "idme") {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const expected = jar.get("idme_state")?.value;
    jar.delete("idme_state");
    if (!code || !state || state !== expected) return deny("state mismatch — please try again");
    try {
      const result = await idmeVerify(code, `${base}/api/verify/idme/callback`);
      return result.verified ? grant() : deny(result.detail ?? "not verified");
    } catch (e) {
      console.error("ID.me callback failed:", e);
      return deny("verification service error");
    }
  }

  if (provider === "sheerid") {
    const vid = jar.get("sheerid_vid")?.value;
    if (!vid) return deny("no verification in progress — start again");
    try {
      const result = await sheeridCheckStatus(vid);
      return result.verified ? grant() : deny(result.detail ?? "not complete yet");
    } catch (e) {
      console.error("SheerID callback failed:", e);
      return deny("verification service error");
    }
  }

  return NextResponse.json({ error: "unknown provider" }, { status: 404 });
}
