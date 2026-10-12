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

  const models = Array.from(new Set([model, "gemini-3.6-flash", "gemini-3.5-flash-lite"]));
  let lastStatus = 0;
  let lastBody = "";
  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
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
        });
        if (res.ok) {
          return NextResponse.json({ keyPresent: true, working: true, detail: `AI is live (${m}).` });
        }
        lastStatus = res.status;
        lastBody = await res.text().catch(() => "");
        if (res.status === 503 || res.status === 429) {
          await new Promise((r) => setTimeout(r, 900));
          continue;
        }
        break; // 404 etc. — try the next model
      } catch (e) {
        return NextResponse.json({
          keyPresent: true,
          working: false,
          detail: `Key is set, but the AI endpoint is unreachable (${e instanceof Error ? e.message : "network error"}).`,
        });
      }
    }
  }
  return NextResponse.json({
    keyPresent: true,
    working: false,
    detail: `Key is set, but the AI call failed (HTTP ${lastStatus}). ${lastBody.slice(0, 160)}`,
  });
}
