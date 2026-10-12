import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/verify/sheerid/webhook
 * Receives SheerID verification notifications (configure the URL in the
 * SheerID program dashboard).
 *
 * STUB — the exact event payload shape must be confirmed in the SheerID
 * dashboard when notifications are enabled. The trial cookie is httpOnly and
 * tied to the user's browser, so a webhook alone cannot grant a trial here;
 * use it for server-side logging / CRM, and let the user-facing grant flow
 * through /api/verify/sheerid/callback (which polls verification status).
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("SheerID webhook received:", JSON.stringify(payload).slice(0, 2000));
  } catch {
    console.log("SheerID webhook received with non-JSON body");
  }
  // TODO: verify webhook signature per SheerID docs before trusting payloads.
  return NextResponse.json({ received: true });
}
