import { NextResponse } from "next/server";
import { providerStatus } from "@/lib/verification";

export const runtime = "nodejs";

/** Which verification providers are configured (keys present). Drives the paywall UI. */
export async function GET() {
  return NextResponse.json(providerStatus());
}
