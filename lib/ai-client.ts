import type { AiResponse } from "./types";

/**
 * Client for /api/ai — RR-11.
 *
 * Every AI call site goes through here so the response handling is the
 * SummaryCard pattern everywhere: read the body as text, parse JSON under
 * a guard, and NEVER let a raw browser exception reach the user's screen.
 * (On a non-JSON body — e.g. a platform error page — Safari's res.json()
 * throws "The string did not match the expected pattern.", which is how a
 * raw system string once shipped to users.) Errors thrown from here carry
 * user-shaped messages only; raw details go to the console.
 */

const FRIENDLY = {
  network: "Couldn't reach the AI service. Check your connection and try again in a moment.",
  unreadable: "The AI service sent back something unreadable. Please try again in a moment.",
  incomplete: "The AI service sent back an incomplete response. Please try again.",
  http: (status: number) => `The AI service returned an error (HTTP ${status}). Please try again in a moment.`,
} as const;

/** Read a fetch Response's JSON body under a guard. Returns the parsed
 *  value, or null when the body isn't JSON. Never throws. */
export async function readJson(res: Response): Promise<unknown> {
  try {
    const raw = await res.text();
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** POST a task to /api/ai and return its envelope, or throw an Error with
 *  a user-shaped message. Server-provided `error` strings (validation,
 *  throttle) are already user-shaped and pass through. */
export async function postAi<T>(body: unknown): Promise<AiResponse<T>> {
  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("AI request failed to send:", e);
    throw new Error(FRIENDLY.network);
  }
  const json = await readJson(res);
  if (!isRecord(json)) {
    console.error(`AI request returned a non-JSON body (HTTP ${res.status})`);
    throw new Error(res.ok ? FRIENDLY.unreadable : FRIENDLY.http(res.status));
  }
  if (typeof json.error === "string" && json.error) {
    throw new Error(json.error);
  }
  if (!res.ok) throw new Error(FRIENDLY.http(res.status));
  if (!("data" in json)) {
    console.error("AI response envelope is missing `data`", json);
    throw new Error(FRIENDLY.incomplete);
  }
  return json as unknown as AiResponse<T>;
}
