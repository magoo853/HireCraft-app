/**
 * HireCraft accessibility audit — Cycle 10.
 *
 * Static scan of app/ + components/ (.tsx) for four issue classes:
 *   1. Icon-only interactive elements with no accessible name. An element
 *      counts as text-bearing if its inner JSX (tags stripped, expression
 *      sources retained) contains any letter/digit — data-driven children
 *      ({label}, {t.name}, ternaries with string literals) are text.
 *   2. Focus visibility: elements with focus explicitly suppressed
 *      (focus:outline-none, no replacement), and whether a global
 *      :focus-visible outline rule exists in globals.css. Elements using
 *      the shared `inputCls` const (focus:ring-2) count as explicit.
 *   3. Touch targets: interactive elements whose explicit (min-h/h/style)
 *      or estimated (padding + line-height) height is under 44px.
 *      Wrappers around a nested <Button>/<button> are skipped (the child
 *      is scanned itself); <Button> resolves to the shared component's
 *      min-h-[44px] base; `inputCls` resolves to its min-h-[44px].
 *      Remaining candidates are adjudicated in the improvement log.
 *   4. Muted/secondary-text contrast: WCAG ratios for a curated table of
 *      foreground/background pairings actually used in the UI. Values in
 *      the table mirror the current source; update them with the source.
 *
 * Usage: node tests/a11y-audit.mjs   (exit code always 0 — reporting tool)
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SCAN_DIRS = ["app", "components"];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/* Shared-component facts, read from source so the audit can't drift. */
const uiSrc = readFileSync(join(ROOT, "components/ui.tsx"), "utf8");
const INPUTCLS_44 = /export const inputCls = "[^"]*min-h-\[44px\]/.test(uiSrc);
const INPUTCLS_FOCUS = /export const inputCls = "[^"]*focus:ring/.test(uiSrc);
const BUTTON_BASE_44 = /const base = "[^"]*min-h-\[44px\]/.test(uiSrc);

/* ---------------- JSX element extraction (pragmatic scanner) ------------- */

const INTERACTIVE_TAGS = new Set(["button", "a", "Link", "input", "select", "textarea", "Button"]);

function lineOf(src, idx) {
  return src.slice(0, idx).split("\n").length;
}

function openTagEnd(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return i;
  }
  return -1;
}

function extractElements(src) {
  const els = [];
  const tagRe = /<([A-Za-z][A-Za-z0-9.]*)/g;
  let m;
  while ((m = tagRe.exec(src))) {
    const tag = m[1];
    const start = m.index;
    const end = openTagEnd(src, start);
    if (end === -1) continue;
    const openTag = src.slice(start, end + 1);
    const selfClosing = openTag.endsWith("/>");
    const hasOnClick = /\bonClick\b/.test(openTag);
    if (!INTERACTIVE_TAGS.has(tag) && !hasOnClick) continue;
    let inner = "";
    if (!selfClosing && tag !== "input") {
      const closeRe = new RegExp(`</?${tag.replace(".", "\\.")}(?=[\\s>/])`, "g");
      closeRe.lastIndex = end + 1;
      let depth = 1;
      let cm;
      let innerEnd = -1;
      while ((cm = closeRe.exec(src))) {
        const tEnd = openTagEnd(src, cm.index);
        const isClose = src[cm.index + 1] === "/";
        const isSelf = !isClose && src.slice(cm.index, tEnd + 1).endsWith("/>");
        if (isClose) { depth--; if (depth === 0) { innerEnd = cm.index; break; } }
        else if (!isSelf) depth++;
      }
      if (innerEnd !== -1) inner = src.slice(end + 1, innerEnd);
    }
    els.push({ tag, openTag, inner, line: lineOf(src, start), hasOnClick });
  }
  return els;
}

function classText(openTag) {
  const m = openTag.match(/className=(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*")/);
  return m ? m[1] : "";
}

/* ---------------- Class 3 size evidence ---------------------------------- */

function px(re, text) {
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function sizeEvidence(el) {
  const cls = classText(el.openTag);
  const afterInset = px(/after:-inset-\[(\d+)px\]/, cls) ?? 0;
  let h = px(/min-h-\[(\d+)px\]/, cls) ?? px(/h-\[(\d+)px\]/, cls) ?? px(/minHeight:\s*"?(\d+)/, el.openTag);
  if (h === null) {
    const hn = cls.match(/(?:^|[\s"{])h-(\d+)(?:[\s"}]|$)/);
    if (hn) h = parseInt(hn[1], 10) * 4;
  }
  if (h === null && cls.includes("inputCls") && INPUTCLS_44) h = 44;
  if (h === null && el.tag === "Button" && BUTTON_BASE_44) h = 44;
  let w = px(/min-w-\[(\d+)px\]/, cls) ?? px(/w-\[(\d+)px\]/, cls);
  if (w === null) {
    const wn = cls.match(/(?:^|[\s"{])w-(\d+)(?:[\s"}]|$)/);
    if (wn) w = parseInt(wn[1], 10) * 4;
  }
  let est = null;
  if (h === null) {
    const py = cls.match(/p[ y]-(\d+(?:\.\d+)?)/);
    const lh =
      /text-\[10/.test(cls) ? 15 : /text-\[11/.test(cls) ? 16 : /text-xs/.test(cls) ? 16 :
      /text-\[13/.test(cls) ? 18 : /text-sm/.test(cls) ? 20 : /text-\[15/.test(cls) ? 22 : 20;
    est = (py ? parseFloat(py[1]) * 8 : 0) + lh;
  }
  return {
    height: h !== null ? h + afterInset * 2 : null,
    width: w !== null ? w + afterInset * 2 : null,
    estHeight: est,
  };
}

/* ---------------- Class 4 contrast --------------------------------------- */

function lum(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function blend(fgHex, alpha, bgHex) {
  const f = [1, 3, 5].map((i) => parseInt(fgHex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(bgHex.slice(i, i + 2), 16));
  return "#" + f.map((v, i) => Math.round(alpha * v + (1 - alpha) * b[i]).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function ratio(fg, bg) {
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Pairings as used in the UI. fg/bg may be [hex, alpha, overHex] blends.
 *  Values mirror the CURRENT source — after Cycle 10 fixes:
 *  inactive segmented-tab labels use slate-600 (muted token unchanged);
 *  brand-green TEXT on light backgrounds uses emerald-700. */
const PAIRINGS = [
  // [fg, bg, where, documentedNote?]
  ["#64748B", "#FFFFFF", "muted text on white cards (SectionTitle subs, hints, fine print)"],
  ["#64748B", "#F8FAFC", "muted text on paper page background (= slate-500 privacy meta line)"],
  ["#64748B", "#ECFDF5", "muted text on mint surfaces"],
  ["#475569", blend("#E2E8F0", 0.6, "#F8FAFC"), "inactive tab label (slate-600 after fix) on segmented track, slate-200/60 over paper"],
  ["#475569", blend("#E7E5E4", 0.6, "#F8FAFC"), "inactive tab label (slate-600 after fix) on resume tab track, stone-200/60 over paper"],
  ["#475569", "#F1F5F9", "inactive density toggle label (slate-600 after fix) on slate-100"],
  ["#64748B", "#FFFFFF", "input placeholder (placeholder:text-slate-500 after fix, full opacity, on white inputs)"],
  ["#047857", "#FFFFFF", "brand-green TEXT links/labels on white (emerald-700 after fix)"],
  ["#047857", "#F8FAFC", "brand-green TEXT links on paper (emerald-700 after fix)"],
  ["#10B981", "#0B1220", "Holland Code display text, brand on navy (large text)"],
  ["#FFFFFF", "#10B981", "white text on brand-green fills — primary CTA buttons", "DOCUMENTED RESIDUAL: 2.54:1. Primary brand component color; changing it is a brand decision for James, out of scope for a correction pass. Badges (secondary labels) using this pairing were moved to emerald-700 — see next row."],
  ["#FFFFFF", "#047857", "white text on emerald-700 badges (NEW / launch / plan badges after fix)"],
  ["#64748B", "#F8FAFC", "privacy page footer text (slate-500 after fix) on slate-50"],
  ["#064E3B", "#F4FDFB", "translation footnote (full emerald-900 after fix) on emerald-50/60 card"],
  [blend("#FFFFFF", 0.6, "#0B1220"), "#0B1220", "white/60 text on navy cards"],
  [blend("#FFFFFF", 0.7, "#0B1220"), "#0B1220", "white/70 text on navy cards"],
  [blend("#FFFFFF", 0.75, "#0B1220"), "#0B1220", "white/75 text on navy cards"],
  [blend("#0B1220", 0.7, "#ECFDF5"), "#ECFDF5", "ink/70 promo body text on mint"],
  ["#475569", "#F1F5F9", "slate-600 'why it works' text on slate-100"],
  ["#334155", "#F8FAFC", "slate-700 ATS parsed text on paper"],
  ["#991B1B", "#FEF2F2", "red-800 keyword chips on red-50"],
  ["#B91C1C", "#FFFFFF", "red-700 error/✗ text on white"],
  ["#92400E", "#FFFBEB", "amber-800 note text on amber-50"],
  ["#78350F", "#FEF3C7", "amber-900 pill text on amber-100"],
  ["#064E3B", "#D1FAE5", "emerald-900 pill text on emerald-100"],
  ["#0A66C2", "#FFFFFF", "LinkedIn-blue text on white"],
  ["#0A66C2", "#EFF6FF", "LinkedIn-blue label on blue-50 (selected headline)"],
  ["#0B3B2E", "#ECFDF5", "pine text on mint (selected chips)"],
  ["#475569", "#F4FDFB", "slate-600 translation 'about' text on emerald-50/60 card"],
  ["#FFFFFF", "#DC2626", "BottomNav badge count on red-600 (after fix)"],
  ["#FCD34D", "#0B1220", "amber-300 verification note on navy"],
];

/* ---------------- Run ----------------------------------------------------- */

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
const globalsCss = readFileSync(join(ROOT, "app/globals.css"), "utf8");
const hasGlobalFocusRule = /:focus-visible\s*\{[^}]*outline/.test(globalsCss);

const c1 = [];
const c2Suppressed = [];
let interactiveTotal = 0;
let explicitFocus = 0;
const c3 = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const rel = relative(ROOT, f);
  for (const el of extractElements(src)) {
    if (el.openTag.includes('type="file"') && el.openTag.includes("hidden")) continue; // display:none upload input; its <label> is the control
    interactiveTotal++;
    const cls = classText(el.openTag);
    const hasName = /aria-label|aria-labelledby|\btitle=/.test(el.openTag);
    // Class 1 — button-like elements only; inner text = tags stripped, expression sources retained
    const isButtonLike = ["button", "a", "Link", "Button"].includes(el.tag) ||
      (el.hasOnClick && ["div", "span", "label"].includes(el.tag));
    if (isButtonLike && !hasName) {
      const stripped = el.inner.replace(/<[^>]*>/g, " ");
      if (!/[A-Za-z0-9]/.test(stripped)) {
        c1.push(`${rel}:${el.line} <${el.tag}> inner=${JSON.stringify(el.inner.slice(0, 60))}`);
      }
    }
    // Class 2
    if (/\bfocus:/.test(cls) || /\bfocus-visible:/.test(cls) || (cls.includes("inputCls") && INPUTCLS_FOCUS)) explicitFocus++;
    if (/focus:outline-none/.test(cls) && !/focus:(ring|border|bg|outline-offset)/.test(cls) && !cls.includes("inputCls")) {
      c2Suppressed.push(`${rel}:${el.line} <${el.tag}>`);
    }
    // Class 3
    if (el.tag === "textarea") continue; // multi-line by design
    if (/<(Button|button)[\s>]/.test(el.inner)) continue; // wrapper; nested control scanned itself
    const { height, width, estHeight } = sizeEvidence(el);
    const hEff = height !== null ? height : estHeight;
    if (hEff !== null && hEff < 44) {
      c3.push(`${rel}:${el.line} <${el.tag}> height≈${hEff}${height === null ? " (estimated)" : ""}`);
    } else if (width !== null && width < 44 && height !== null && height >= 44) {
      c3.push(`${rel}:${el.line} <${el.tag}> width≈${width} (height ok)`);
    }
  }
}

console.log("=== HireCraft a11y audit ===");
console.log(`Files scanned: ${files.length}; interactive elements found: ${interactiveTotal}`);
console.log(`Shared facts: inputCls min-h-44=${INPUTCLS_44}, inputCls focus ring=${INPUTCLS_FOCUS}, Button base min-h-44=${BUTTON_BASE_44}`);
console.log(`\nCLASS 1 — icon-only interactive, no accessible name: ${c1.length}`);
c1.forEach((x) => console.log("  " + x));
console.log(`\nCLASS 2 — focus visibility`);
console.log(`  global :focus-visible outline rule in globals.css: ${hasGlobalFocusRule ? "YES" : "NO"}`);
console.log(`  elements with explicit focus styling (incl. inputCls ring): ${explicitFocus}`);
console.log(`  elements with focus suppressed (focus:outline-none, no replacement): ${c2Suppressed.length}`);
c2Suppressed.forEach((x) => console.log("    " + x));
console.log(`  UNCOVERED (no explicit style and no global rule): ${hasGlobalFocusRule ? c2Suppressed.length : interactiveTotal - explicitFocus}`);
console.log(`\nCLASS 3 — touch targets under 44px (candidates; adjudication in improvement log): ${c3.length}`);
c3.forEach((x) => console.log("  " + x));
console.log(`\nCLASS 4 — muted/secondary text contrast (WCAG, threshold 4.5:1)`);
let fails = 0;
for (const [fg, bg, where, note] of PAIRINGS) {
  const r = ratio(fg, bg);
  const pass = r >= 4.5;
  if (!pass && !note) fails++;
  console.log(`  ${pass ? "PASS" : note ? "DOC " : "FAIL"} ${r.toFixed(2)}:1  ${fg} on ${bg} — ${where}${note ? " | " + note : ""}`);
}
console.log(`  Undocumented failures: ${fails}`);
