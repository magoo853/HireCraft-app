import { NextRequest, NextResponse } from "next/server";
import {
  providerAvailable,
  sheeridCheckStatus,
  sheeridWebhookSecret,
  verifySheeridSignature,
} from "@/lib/verification";

export const runtime = "nodejs";

/**
 * POST /api/verify/sheerid/webhook
 * Receives SheerID verification notifications (configure the URL in the
 * SheerID program dashboard; events per SheerID's webhook guide:
 * { verificationId, notifierEventType }, no PII in the payload).
 *
 * FAIL-CLOSED IN V1: military verification is disabled at launch (see the
 * launch gate in lib/verification.ts), so while SheerID is not live AND
 * configured this endpoint accepts nothing — a controlled 503 without
 * reading or trusting the payload.
 *
 * Enabled path (post-launch, ready now): the X-SheerID-Signature header is
 * verified FIRST — lowercase hex HMAC-SHA256 of the raw body, keyed by the
 * account Secret Token (SHEERID_WEBHOOK_SECRET) — and unsigned or badly
 * signed deliveries are rejected 401 before any payload field is read.
 * A verified event is a signal only: the authoritative state is re-checked
 * server-side via the SheerID API, and the endpoint then acknowledges 200
 * (SheerID retries any non-2xx). The trial cookie is httpOnly and tied to
 * the user's browser, so a webhook alone can never grant a trial here —
 * grants happen only in /api/verify/sheerid/callback after a server-side
 * status check. Handling is idempotent: duplicate deliveries re-check the
 * same status and acknowledge the same way.
 */
export async function POST(req: NextRequest) {
  if (!providerAvailable("sheerid")) {
    return NextResponse.json(
      { error: "sheerid webhook is not enabled", received: false },
      { status: 503 }
    );
  }
  if (!sheeridWebhookSecret()) {
    // Live provider but no signing secret configured: nothing can be
    // verified, so nothing is trusted.
    return NextResponse.json(
      { error: "sheerid webhook secret is not configured", received: false },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  if (!verifySheeridSignature(rawBody, req.headers.get("x-sheerid-signature"))) {
    return NextResponse.json(
      { error: "invalid signature", received: false },
      { status: 401 }
    );
  }

  let payload: { verificationId?: unknown; notifierEventType?: unknown };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json(
      { error: "malformed payload", received: false },
      { status: 400 }
    );
  }
  const verificationId =
    typeof payload.verificationId === "string" ? payload.verificationId : "";
  if (!verificationId) {
    return NextResponse.json(
      { error: "missing verificationId", received: false },
      { status: 400 }
    );
  }
  const eventType =
    typeof payload.notifierEventType === "string" ? payload.notifierEventType : "unknown";

  // Signal only — re-check the authoritative status server-side; never act
  // on payload fields. The outcome is logged for observability (IDs and
  // event types only; SheerID payloads carry no PII).
  try {
    const status = await sheeridCheckStatus(verificationId);
    console.info(
      `sheerid webhook: event=${eventType} verification=${verificationId} verified=${status.verified} (${status.detail ?? ""})`
    );
  } catch (e) {
    console.error("sheerid webhook status re-check failed:", e);
  }
  return NextResponse.json({ received: true });
}
