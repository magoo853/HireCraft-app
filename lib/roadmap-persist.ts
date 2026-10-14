import type { RoadmapGoal, RoadmapNode } from "./careers-core";
import type { AiResponse } from "./types";

/**
 * Roadmap persistence shape (Wave 4) — the Roadmap page's goals key
 * (`hirecraft-roadmap-goals-v2`) historically stored the bare goals
 * array. Wave 4 stores `{ goals, nodes }` in the SAME key so a built
 * roadmap survives navigation. The parse side is additive and
 * legacy-safe: a bare array (every pre-Wave-4 save) loads as goals
 * with no nodes; a malformed value loads as null and the page falls
 * back to its defaults/migration. Pure functions, unit-testable
 * without React.
 */
export interface RoadmapPersisted {
  goals: RoadmapGoal[];
  nodes: AiResponse<RoadmapNode[]> | null;
}

export function serializeRoadmapState(
  goals: RoadmapGoal[],
  nodes: AiResponse<RoadmapNode[]> | null
): string {
  return JSON.stringify({ goals, nodes });
}

export function parseRoadmapState(raw: string | null): RoadmapPersisted | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  // Legacy shape: the bare goals array.
  if (Array.isArray(parsed)) {
    return parsed.length ? { goals: parsed as RoadmapGoal[], nodes: null } : null;
  }
  if (parsed && typeof parsed === "object") {
    const p = parsed as { goals?: unknown; nodes?: unknown };
    const goals = Array.isArray(p.goals) ? (p.goals as RoadmapGoal[]) : [];
    const nodes =
      p.nodes && typeof p.nodes === "object" && Array.isArray((p.nodes as AiResponse<RoadmapNode[]>).data)
        ? (p.nodes as AiResponse<RoadmapNode[]>)
        : null;
    if (goals.length || nodes) return { goals, nodes };
  }
  return null;
}
