import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ProviderId,
  appBaseUrl,
  idmeAuthorizeUrl,
  idmeConfigured,
  randomState,
  sheeridConfigured,
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
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as ProviderId;
  const base = appBaseUrl();
  const origin = new URL(req.url).origin; // where the user actually is (dev ports etc.)
  const jar = cookies();

  if (provider === "idme") {
    if (!idmeConfigured()) {
      return NextResponse.redirect(`${origin}/paywall?trial=unavailable`);
    }
    const state = randomState();
    jar.set("idme_state", state, { httpOnly: true, path: "/", maxAge: 600, sameSite: "lax" });
    // redirect_uri must exactly match the URI registered in the ID.me app dashboard
    const redirectUri = `${base}/api/verify/idme/callback`;
    return NextResponse.redirect(idmeAuthorizeUrl(state, redirectUri));
  }

  if (provider === "sheerid") {
    if (!sheeridConfigured()) {
      return NextResponse.redirect(`${origin}/paywall?trial=unavailable`);
    }
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
