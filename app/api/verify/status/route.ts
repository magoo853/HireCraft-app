import { NextResponse } from "next/server";
import { providerStatus } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which verification providers are usable right now. Drives the paywall UI.
 * In v1 verification is disabled (see lib/verification.ts launch gate), so
 * this reports { idme: false, sheerid: false, available: false } and the
 * paywall shows the military offer as coming soon — nothing here verifies
 * or grants anything.
 */
export async function GET() {
  return NextResponse.json(providerStatus());
}
