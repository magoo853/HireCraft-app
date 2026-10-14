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
/** Wave 4 tracker-lite: where this application stands. Lite only —
 *  status + optional date/note pinned to the version, nothing more. */
export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "closed";
export interface VersionApplication {
  status: ApplicationStatus;
  appliedAt?: number;
  note?: string;
}

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "saved", "applied", "interviewing", "offer", "closed",
];

/** Wave 4 design snapshot: the Design tab's density + Custom Studio
 *  options in effect when the version was saved, so a load restores the
 *  look exactly as saved. designOpts is kept structural (whitelisted
 *  string keys) so this module never imports the templates module. */
export type VersionDensity = "comfortable" | "compact";
export type VersionDesignOpts = Partial<Record<string, string>>;

const DESIGN_OPT_KEYS: readonly string[] = [
  "accent", "font", "headerStyle", "nameAlign", "nameSize",
  "skillsStyle", "bulletStyle", "contactStyle", "spacing",
];

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
  /** The cover letter written for this job (Wave 3 application packet).
   *  Optional/additive — legacy versions have no field and load unchanged. */
  coverLetter?: string;
  /** Wave 4 tracker-lite. Optional/additive — legacy versions have no
   *  field and load unchanged; an invalid status drops the field. */
  application?: VersionApplication;
  /** Wave 4 design snapshot. Optional/additive — legacy versions have
   *  neither field and leave current design settings untouched. */
  density?: VersionDensity;
  designOpts?: VersionDesignOpts;
}

/** Everything a save captures from the live store. */
export interface VersionContext {
  targetTitle: string;
  company: string;
  jobText: string;
  jobUrl: string;
  templateId: string;
  resume: StructuredResume;
  /** Current cover-letter text at save time; "" when there is none. */
  coverLetter?: string;
  /** Tracker state to carry into the snapshot, when one is set. */
  application?: VersionApplication;
  /** Current Design density + design options at save time. */
  density?: VersionDensity;
  designOpts?: VersionDesignOpts;
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

/** Validate a tracker record: unknown status → undefined (the field is
 *  dropped, never coerced into a wrong state); appliedAt must be a
 *  finite epoch; note is kept only when a non-empty string. */
export function sanitizeApplication(raw: unknown): VersionApplication | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const a = raw as Partial<VersionApplication>;
  if (typeof a.status !== "string" || !(APPLICATION_STATUSES as readonly string[]).includes(a.status)) {
    return undefined;
  }
  const out: VersionApplication = { status: a.status as ApplicationStatus };
  if (typeof a.appliedAt === "number" && isFinite(a.appliedAt)) out.appliedAt = a.appliedAt;
  if (typeof a.note === "string" && a.note) out.note = a.note;
  return out;
}

/** Validate a density value; anything else → undefined. */
export function sanitizeDensity(raw: unknown): VersionDensity | undefined {
  return raw === "comfortable" || raw === "compact" ? raw : undefined;
}

/** Validate design options structurally: a plain object whose known
 *  keys hold non-empty strings. Unknown keys are dropped. */
export function sanitizeDesignOpts(raw: unknown): VersionDesignOpts | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: VersionDesignOpts = {};
  for (const k of DESIGN_OPT_KEYS) {
    const v = src[k];
    if (typeof v === "string" && v) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Build a snapshot of the current context (resume deep-cloned). */
export function createVersion(ctx: VersionContext, name: string, now?: number): SavedVersion {
  const trimmed = name.trim();
  const application = ctx.application ? sanitizeApplication(ctx.application) : undefined;
  const density = ctx.density ? sanitizeDensity(ctx.density) : undefined;
  const designOpts = ctx.designOpts ? sanitizeDesignOpts(ctx.designOpts) : undefined;
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
    ...(ctx.coverLetter ? { coverLetter: ctx.coverLetter } : {}),
    ...(application ? { application } : {}),
    ...(density ? { density } : {}),
    ...(designOpts ? { designOpts: { ...designOpts } } : {}),
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

/** Set/replace a version's tracker record; `undefined` (or an invalid
 *  record) clears it. Other versions are returned untouched. */
export function setVersionApplication(
  list: SavedVersion[],
  id: string,
  application: VersionApplication | undefined
): SavedVersion[] {
  const clean = application ? sanitizeApplication(application) : undefined;
  return list.map((v) => {
    if (v.id !== id) return v;
    const next = { ...v };
    if (clean) next.application = clean;
    else delete next.application;
    return next;
  });
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
  const application = v.application ? sanitizeApplication(v.application) : undefined;
  const density = v.density ? sanitizeDensity(v.density) : undefined;
  const designOpts = v.designOpts ? sanitizeDesignOpts(v.designOpts) : undefined;
  return {
    targetTitle: v.targetTitle,
    company: v.company,
    jobText: v.jobText,
    jobUrl: v.jobUrl,
    templateId: v.templateId || "modern",
    resume: cloneResume(v.resume),
    coverLetter: typeof v.coverLetter === "string" ? v.coverLetter : "",
    ...(application ? { application } : {}),
    ...(density ? { density } : {}),
    ...(designOpts ? { designOpts: { ...designOpts } } : {}),
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
    const application = sanitizeApplication(e.application);
    const density = sanitizeDensity(e.density);
    const designOpts = sanitizeDesignOpts(e.designOpts);
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
      ...(typeof e.coverLetter === "string" && e.coverLetter ? { coverLetter: e.coverLetter } : {}),
      ...(application ? { application } : {}),
      ...(density ? { density } : {}),
      ...(designOpts ? { designOpts } : {}),
    });
  }
  return out;
}
