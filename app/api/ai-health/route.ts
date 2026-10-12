import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Honest AI status check: is a key set, and does a live call actually work? */
export async function GET() {
  const key = process.env.AI_API_KEY;
  const base = (process.env.AI_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gemini-3.8-flash";

  if (!key) {
    return NextResponse.json({ keyPresent: false, working: false, detail: "No AI_API_KEY set — running on the built-in engine." });
  }

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with the single word: ok" }],
        max_tokens: 5,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({
        keyPresent: true,
        working: false,
        detail: `Key is set, but the AI call failed (HTTP ${res.status}). ${body.slice(0, 160)}`,
      });
    }
    return NextResponse.json({ keyPresent: true, working: true, detail: `AI is live (${model}).` });
  } catch (e) {
    return NextResponse.json({
      keyPresent: true,
      working: false,
      detail: `Key is set, but the AI endpoint is unreachable (${e instanceof Error ? e.message : "network error"}).`,
    });
  }
}
