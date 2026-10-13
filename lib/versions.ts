import { StructuredResume, emptyResume } from "./types";

/**
 * Saved tailored versions — per-job resume snapshots with restore
 * (Cycle 16; schema designed in the improvement log before building).
 *
 * A version bundles the resume state with the target-job context it was
 * tailored to and the template in effect, stored additively as a
 * `versions` array inside the existing `hirecraft-state-v1` blob. All
 * list logic lives here as pure functions so it is unit-testable
 * without React; the store (lib/store.tsx) holds the state and calls
 * these helpers.
 */
export interface SavedVersion {
  id: string;
  name: string;
  createdAt: number;
  targetTitle: string;
  company: string;
  jobText: string;
  jobUrl: string;
  templateId: string;
  resume: StructuredResume;
}

/** Everything a save captures from the live store. */
export interface VersionContext {
  targetTitle: string;
  company: string;
  jobText: string;
  jobUrl: string;
  templateId: string;
  resume: StructuredResume;
}

export const MAX_VERSIONS = 20;
/** Refuse a save whose serialized versions array would exceed this. */
export const MAX_VERSIONS_BYTES = 2_000_000;

/** Deep clone via JSON — StructuredResume is plain JSON data. */
export function cloneResume(r: StructuredResume): StructuredResume {
  return JSON.parse(JSON.stringify(r)) as StructuredResume;
}

function newId(): string {
  return `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Default version name from the target-job context. */
export function defaultVersionName(ctx: VersionContext): string {
  const title = ctx.targetTitle.trim();
  const company = ctx.company.trim();
  if (title && company) return `${title} — ${company}`;
  if (title) return title;
  if (company) return `Tailored resume — ${company}`;
  return "Tailored resume";
}

/** Build a snapshot of the current context (resume deep-cloned). */
export function createVersion(ctx: VersionContext, name: string, now?: number): SavedVersion {
  const trimmed = name.trim();
  return {
    id: newId(),
    name: trimmed || defaultVersionName(ctx),
    createdAt: typeof now === "number" ? now : Date.now(),
    targetTitle: ctx.targetTitle,
    company: ctx.company,
    jobText: ctx.jobText,
    jobUrl: ctx.jobUrl,
    templateId: ctx.templateId || "modern",
    resume: cloneResume(ctx.resume),
  };
}

export type AddVersionResult =
  | { ok: true; versions: SavedVersion[] }
  | { ok: false; error: string };

/**
 * Prepend a version (list is newest-first). Refuses — never evicts —
 * at the count cap, and refuses a snapshot that would push the
 * serialized versions array past the byte cap (the quota guard: it
 * keeps versions from ever overflowing localStorage, and the caller
 * gets a message to show instead of a crash or a silent loss).
 */
export function addVersion(list: SavedVersion[], v: SavedVersion): AddVersionResult {
  if (list.length >= MAX_VERSIONS) {
    return { ok: false, error: `You have ${MAX_VERSIONS} saved versions — delete one to save another.` };
  }
  const next = [v].concat(list);
  let bytes = 0;
  try {
    bytes = JSON.stringify(next).length;
  } catch {
    return { ok: false, error: "That version couldn't be saved." };
  }
  if (bytes > MAX_VERSIONS_BYTES) {
    return { ok: false, error: "Your saved versions are full — delete one to save another." };
  }
  return { ok: true, versions: next };
}

/** Rename in place; an empty name is refused by returning the list unchanged. */
export function renameVersion(list: SavedVersion[], id: string, name: string): SavedVersion[] {
  const trimmed = name.trim();
  if (!trimmed) return list;
  return list.map((v) => (v.id === id ? { ...v, name: trimmed } : v));
}

export function removeVersion(list: SavedVersion[], id: string): SavedVersion[] {
  return list.filter((v) => v.id !== id);
}

export function findVersion(list: SavedVersion[], id: string): SavedVersion | null {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

/**
 * Load the live context back out of a version. The resume is a fresh
 * deep clone, so editing after a load can never mutate the snapshot.
 */
export function versionToContext(v: SavedVersion): VersionContext {
  return {
    targetTitle: v.targetTitle,
    company: v.company,
    jobText: v.jobText,
    jobUrl: v.jobUrl,
    templateId: v.templateId || "modern",
    resume: cloneResume(v.resume),
  };
}

function asString(x: unknown): string {
  return typeof x === "string" ? x : "";
}

/**
 * Validate persisted versions on load (the store's load guard for the
 * `versions` key). Legacy blobs have no key → `[]`. Malformed entries
 * are dropped, salvageable ones coerced exactly like the live resume
 * load (`{ ...emptyResume(), ...saved }`), and the list is truncated
 * to the cap keeping the newest (the list is stored newest-first).
 * A corrupt value can never crash load or render.
 */
export function sanitizeVersions(raw: unknown): SavedVersion[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedVersion[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_VERSIONS; i++) {
    const e = raw[i] as Partial<SavedVersion> | null;
    if (!e || typeof e !== "object") continue;
    if (typeof e.id !== "string" || !e.id) continue;
    if (typeof e.name !== "string" || !e.name) continue;
    if (typeof e.createdAt !== "number" || !isFinite(e.createdAt)) continue;
    const r = e.resume as StructuredResume | null;
    if (!r || typeof r !== "object" || !Array.isArray(r.experience)) continue;
    out.push({
      id: e.id,
      name: e.name,
      createdAt: e.createdAt,
      targetTitle: asString(e.targetTitle),
      company: asString(e.company),
      jobText: asString(e.jobText),
      jobUrl: asString(e.jobUrl),
      templateId: asString(e.templateId) || "modern",
      resume: { ...emptyResume(), ...r },
    });
  }
  return out;
}
