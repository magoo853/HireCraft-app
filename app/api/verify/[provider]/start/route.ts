import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ProviderId,
  appBaseUrl,
  idmeAuthorizeUrl,
  providerAvailable,
  randomState,
  sheeridCreateVerification,
} from "@/lib/verification";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/verify/:provider/start
 * Sends the user into the provider's hosted verification flow.
 *  - idme:    OAuth authorize redirect (state in httpOnly cookie for CSRF check)
 *  - sheerid: server creates the verification, then redirects to SheerID's hosted form
 *             (verificationId kept in an httpOnly cookie so the callback can poll it)
 *
 * FAIL-CLOSED IN V1: verification is disabled at launch (see the launch gate
 * in lib/verification.ts). Until it is live AND the provider is configured,
 * this returns a controlled 503 and starts nothing — there is no fallback
 * claim path.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as ProviderId;
  const base = appBaseUrl();
  const origin = new URL(req.url).origin; // where the user actually is (dev ports etc.)
  const jar = cookies();

  if (provider !== "idme" && provider !== "sheerid") {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  if (!providerAvailable(provider)) {
    return NextResponse.json(
      {
        error: "military verification is not available yet",
        detail:
          "The 6-month military offer launches in a post-launch update, once SheerID/ID.me verification is fully integrated. No verification was started and no trial was granted.",
        provider,
        available: false,
      },
      { status: 503 }
    );
  }

  if (provider === "idme") {
    const state = randomState();
    jar.set("idme_state", state, { httpOnly: true, path: "/", maxAge: 600, sameSite: "lax" });
    // redirect_uri must exactly match the URI registered in the ID.me app dashboard
    const redirectUri = `${base}/api/verify/idme/callback`;
    return NextResponse.redirect(idmeAuthorizeUrl(state, redirectUri));
  }

  if (provider === "sheerid") {
    try {
      const { verificationId, hostedUrl } = await sheeridCreateVerification();
      jar.set("sheerid_vid", verificationId, { httpOnly: true, path: "/", maxAge: 3600, sameSite: "lax" });
      return NextResponse.redirect(hostedUrl);
    } catch (e) {
      console.error("SheerID start failed:", e);
      return NextResponse.redirect(`${origin}/paywall?trial=error`);
    }
  }

  return NextResponse.json({ error: "unknown provider" }, { status: 404 });
}
