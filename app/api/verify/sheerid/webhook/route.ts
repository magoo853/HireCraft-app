import { NextRequest, NextResponse } from "next/server";
import { providerAvailable } from "@/lib/verification";

export const runtime = "nodejs";

/**
 * POST /api/verify/sheerid/webhook
 * Receives SheerID verification notifications (configure the URL in the
 * SheerID program dashboard).
 *
 * FAIL-CLOSED IN V1: military verification is disabled at launch (see the
 * launch gate in lib/verification.ts), so this endpoint accepts nothing —
 * it returns a controlled 503 without reading or trusting the payload.
 * The trial cookie is httpOnly and tied to the user's browser, so a webhook
 * alone can never grant a trial here regardless.
 *
 * Before enabling post-launch: confirm the exact event payload shape in the
 * SheerID dashboard AND verify the webhook signature per SheerID docs —
 * unsigned payloads must never be trusted.
 */
export async function POST(_req: NextRequest) {
  if (!providerAvailable("sheerid")) {
    return NextResponse.json(
      { error: "sheerid webhook is not enabled", received: false },
      { status: 503 }
    );
  }
  // Enabled path (post-launch): signature verification goes here, before any
  // payload field is read or acted on. Until that is implemented, keep
  // failing closed rather than trusting notifications.
  return NextResponse.json(
    { error: "sheerid webhook signature verification is not implemented", received: false },
    { status: 503 }
  );
}
