import { NextResponse } from "next/server";
import { aiBreakerOpen, recordAiFailure, recordAiSuccess } from "@/lib/ai-breaker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiHealth = {
  working: boolean;
  detail: string;
};

const CACHE_TTL_MS = 3 * 60 * 1000;
/** Hard ceiling for one probe, across all models/attempts. A stalled
 *  provider must degrade to working:false, never hang the caller
 *  (observed in production: 47–90s stalls, Oct 2026). */
const PROBE_BUDGET_MS = 12_000;
let cachedHealth: { expiresAt: number; result: Promise<AiHealth> } | null = null;

/** Honest AI status check: does a live call actually work right now? */
async function probeAiHealth(): Promise<AiHealth> {
  const key = process.env.AI_API_KEY;
  const base = (process.env.AI_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gemini-3.8-flash";

  if (!key) {
    return { working: false, detail: "AI is not configured — running on the built-in engine." };
  }

  const deadline = Date.now() + PROBE_BUDGET_MS;
  const timeLeft = () => deadline - Date.now();
  const models = Array.from(new Set([model, "gemini-3.6-flash", "gemini-3.5-flash-lite"]));
  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (timeLeft() <= 0) {
        recordAiFailure();
        return {
          working: false,
          detail: "AI is configured, but the AI endpoint is unreachable.",
        };
      }
      try {
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: "user", content: "Reply with the single word: ok" }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(timeLeft()),
        });
        if (res.ok) {
          recordAiSuccess();
          return { working: true, detail: "AI is live." };
        }
        // Consume the response without exposing provider error details to callers.
        await res.text().catch(() => "");
        if (res.status === 503 || res.status === 429) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, Math.min(900, Math.max(0, timeLeft()))));
            continue;
          }
          break;
        }
        break; // 404 etc. — try the next model
      } catch {
        recordAiFailure();
        return {
          working: false,
          detail: "AI is configured, but the AI endpoint is unreachable.",
        };
      }
    }
  }
  recordAiFailure();
  return {
    working: false,
    detail: "AI is configured, but the AI call failed.",
  };
}

export async function GET() {
  // RR-43: while the circuit breaker is open, report down immediately
  // (uncached) instead of spending a probe budget re-discovering it.
  if (aiBreakerOpen()) {
    return NextResponse.json({
      working: false,
      detail: "AI is configured, but the AI endpoint is unreachable.",
    });
  }
  const now = Date.now();
  if (!cachedHealth || cachedHealth.expiresAt <= now) {
    cachedHealth = {
      expiresAt: now + CACHE_TTL_MS,
      result: probeAiHealth(),
    };
  }

  return NextResponse.json(await cachedHealth.result);
}
