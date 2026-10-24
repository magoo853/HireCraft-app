"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  TEMPLATES, EdFn, DesignOptions, DEFAULT_DESIGN_OPTIONS,
  DESIGN_ACCENTS, DESIGN_FONTS, DESIGN_HEADERS, renderCustom,
} from "@/lib/templates";
import { applyTextEditToResume } from "@/lib/resume-sync";
import { StructuredResume } from "@/lib/types";
import { Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import { ProPrompt, useProGate } from "@/components/pro-gate";
import { SaveVersionForm } from "@/components/versions";

const LS_DESIGN_OPTS = "hirecraft-design-opts";

/** Auto-fit: when the rendered resume runs over the 2-page rule, step the
 * template zoom down from the density base until it fits — no user action.
 * FIT_FLOOR is the readability floor; past it the warning banner takes over
 * again (the content genuinely needs trimming). */
const FIT_FLOOR = 0.8;
const FIT_STEP = 0.02;

/** Print geometry at 96 CSS px/in: US Letter minus the print
 * stylesheet's #resume-print padding (0.6in sides, 0.55in top/bottom).
 * The 2-page rule is about the PRINTED sheet, so pages are estimated at
 * true print width — the on-screen preview is capped near phone width by
 * the app shell, and its raw height overcounts pages several-fold. */
const PRINT_CONTENT_PX = 701; // 7.3in of printable width
const PRINT_PAGE_PX = 1056; // 11in page height
const PRINT_VPAD_PX = 106; // top + bottom print padding

const thumbEd: EdFn = (value, _onChange, className = "") => <span className={className}>{value}</span>;

/** Mini live render of the user's actual resume in this template. */
function LiveThumb({ id, resume, designOpts }: { id: string; resume: StructuredResume; designOpts: DesignOptions }) {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  return (
    <div className="relative h-[110px] overflow-hidden rounded-md border border-slate-100 bg-white text-left">
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left p-4"
        style={{ transform: "scale(0.16)", width: "625%" }}
      >
        {id === "custom" ? renderCustom(resume, thumbEd, designOpts) : t.render(resume, thumbEd)}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

export default function DesignPage() {
  const { resume, setResume, hasResume, setDesignChosen, setExported, templateId, setTemplateId, designDensity: density, setDesignDensity: setDensity } = useApp();
  // RR-26: templates + live previews are FREE (listing/FAQ); the paid
  // element is PDF & DOCX export, gated in the app only (native; web
  // stays unlocked). Both export handlers route to /paywall when gated.
  const gate = useProGate();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pages, setPages] = useState(1);
  const [docxBusy, setDocxBusy] = useState(false);
  const [docxError, setDocxError] = useState("");
  const [designOpts, setDesignOpts] = useState<DesignOptions>(DEFAULT_DESIGN_OPTIONS);
  const previewRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  // Auto-fit scale: the TOTAL zoom applied to the template render. Starts
  // at the density base (Comfortable 1, Compact 0.88) and only shrinks
  // further when the measured render is over 2 pages.
  const densityBase = density === "compact" ? 0.88 : 1;
  const [fitScale, setFitScale] = useState(1);

  // Auto-fit reset: a different resume/template/density/options restarts
  // from the density base; the fit loop below only ever shrinks from there.
  useEffect(() => {
    setFitScale(densityBase);
  }, [templateId, resume, density, designOpts, densityBase]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_DESIGN_OPTS);
      if (raw) setDesignOpts({ ...DEFAULT_DESIGN_OPTIONS, ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_DESIGN_OPTS, JSON.stringify(designOpts));
    } catch { /* noop */ }
  }, [designOpts]);

  // 2-page guard: estimate PRINTED pages from a hidden measuring copy of
  // the template rendered at true print width (see PRINT_CONTENT_PX).
  // The copy's width grows as the auto-fit scale shrinks — mirroring how
  // the zoomed sheet lays out wider locally when printed — and the
  // painted height (scale × local height, plus the sheet's vertical
  // print padding) is divided into letter pages. Estimator and print
  // renderer are the same layout, so they cannot disagree.
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight;
      if (h > 0) {
        setPages(Math.max(1, Math.ceil((fitScale * h + PRINT_VPAD_PX) / PRINT_PAGE_PX)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [templateId, resume, density, designOpts, fitScale]);

  // Auto-fit loop: while the measured render is over 2 pages, shrink the
  // zoom one step (the measurement above re-runs on the new scale) until
  // it fits or the readability floor is reached. The estimator measures
  // the same zoomed DOM the user sees and prints, so the page count and
  // the render can never disagree.
  useEffect(() => {
    if (pages <= 2 || fitScale <= FIT_FLOOR + 0.001) return;
    const t = setTimeout(() => {
      setFitScale((s) => Math.max(FIT_FLOOR, +(s - FIT_STEP).toFixed(2)));
    }, 40);
    return () => clearTimeout(t);
  }, [pages, fitScale]);

  if (!hasResume) {
    return (
      <EmptyState
        title="No resume yet"
        body="Add or build your resume first — then pick from nine recruiter-grade designs and export a clean PDF."
        cta="Add my resume" href="/resume"
      />
    );
  }

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const ed: EdFn = (value, _onChange, className = "") => {
    if (!editing) return <span className={className}>{value}</span>;
    return (
      <span
        contentEditable
        suppressContentEditableWarning
        className={`${className} cursor-text`}
        onBlur={(e) => {
          const next = e.currentTarget.textContent ?? "";
          if (next !== value) {
            // Wave 4: scope the edit to the instance actually clicked —
            // its occurrence ordinal among identical editable texts in
            // the preview (templates pass no index identity to ed()).
            let occurrence = 0;
            const root = previewRef.current;
            if (root) {
              const spans = root.querySelectorAll("[contenteditable]");
              for (let i = 0; i < spans.length; i++) {
                if (spans[i] === e.currentTarget) break;
                if (spans[i].textContent === value) occurrence++;
              }
            }
            replaceText(value, next, occurrence);
          }
        }}
      >
        {value}
      </span>
    );
  };

  async function downloadDocx() {
    if (gate !== "open") { router.push("/paywall"); return; }
    if (docxBusy) return;
    setDocxBusy(true);
    setDocxError("");
    try {
      // Dynamic import: the docx library only loads when the user exports.
      const { buildResumeDocxBlob, resumeDocxFileName } = await import("@/lib/docx");
      const blob = await buildResumeDocxBlob(resume, templateId, {
        accent: designOpts.accent,
        font: designOpts.font,
        nameAlign: designOpts.nameAlign,
        headerStyle: designOpts.headerStyle,
      }, fitScale);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resumeDocxFileName(resume);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setExported(true);
      setDocxError("");
      // Give the browser time to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      // No more silent failure: name the PDF path as the fallback.
      setDocxError("DOCX export failed — try Download PDF instead.");
    } finally {
      setDocxBusy(false);
    }
  }

  function printExport() {
    if (gate !== "open") { router.push("/paywall"); return; }
    setExported(true);
    window.print();
  }

  function replaceText(oldText: string, newText: string, occurrence = 0) {
    // Structured-field update + targeted rawText replacement (never a
    // structuredToText regeneration, which would wipe accepted rewrites
    // that live in rawText). The occurrence scopes the edit to the
    // instance the user clicked (Wave 4).
    const next = applyTextEditToResume(resume, oldText, newText, { occurrence });
    if (next !== resume) setResume(next);
  }

  return (
    <div>
      <SectionTitle sub="Tap a template to preview it.">
        Design
      </SectionTitle>

      <div className="grid grid-cols-3 gap-2.5 mb-4 print:hidden">
        {TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => { setTemplateId(t.id); setDesignChosen(true); }}
            className={`bg-white rounded-xl border-2 p-2 text-center transition active:scale-[0.98] ${templateId === t.id ? "border-brand" : "border-line"}`}>
            <LiveThumb id={t.id} resume={resume} designOpts={designOpts} />
            <span className="block text-[11px] font-bold text-ink mt-1.5 leading-tight">{t.name}{templateId === t.id ? " ✓" : ""}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mb-4 print:hidden"><b className="text-ink">{template.name}.</b> {template.blurb}</p>

      {templateId === "custom" && (
        <Card className="mb-4 print:hidden">
          <p className="text-[13px] font-extrabold text-navy mb-3">🎨 Custom studio</p>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Accent color</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {DESIGN_ACCENTS.map((c) => (
              <button key={c} onClick={() => setDesignOpts({ ...designOpts, accent: c })}
                aria-label={`Accent ${c}`}
                className={`w-11 h-11 rounded-full min-h-[44px] border-[3px] transition ${designOpts.accent === c ? "border-ink scale-110" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Font</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DESIGN_FONTS.map((f) => (
              <button key={f.id} onClick={() => setDesignOpts({ ...designOpts, font: f.id })}
                className={`text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] ${designOpts.font === f.id ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}
                style={{ fontFamily: f.stack }}>
                {f.name}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Section headers</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DESIGN_HEADERS.map((h) => (
              <button key={h.id} onClick={() => setDesignOpts({ ...designOpts, headerStyle: h.id })}
                className={`text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] ${designOpts.headerStyle === h.id ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}>
                {h.name}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Name alignment</p>
          <div className="flex gap-1.5 mb-3">
            {(["left", "center"] as const).map((a) => (
              <button key={a} onClick={() => setDesignOpts({ ...designOpts, nameAlign: a })}
                className={`flex-1 text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] capitalize ${designOpts.nameAlign === a ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}>
                {a}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Name size</p>
          <div className="flex gap-1.5 mb-3">
            {([["standard", "Standard"], ["large", "Large"]] as const).map(([id, name]) => (
              <button key={id} onClick={() => setDesignOpts({ ...designOpts, nameSize: id })}
                className={`flex-1 text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] ${designOpts.nameSize === id ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}>
                {name}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Section spacing</p>
          <div className="flex gap-1.5 mb-3">
            {([["relaxed", "Relaxed"], ["standard", "Standard"], ["tight", "Tight"]] as const).map(([id, name]) => (
              <button key={id} onClick={() => setDesignOpts({ ...designOpts, spacing: id })}
                className={`flex-1 text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] ${designOpts.spacing === id ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}>
                {name}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Skills style</p>
          <div className="flex gap-1.5 mb-3">
            {([["pills", "Pills"], ["list", "Inline list"], ["columns", "Columns"]] as const).map(([id, name]) => (
              <button key={id} onClick={() => setDesignOpts({ ...designOpts, skillsStyle: id })}
                className={`flex-1 text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] ${designOpts.skillsStyle === id ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}>
                {name}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Bullet markers</p>
          <div className="flex gap-1.5 mb-3">
            {([["arrow", "▸ Arrow"], ["dot", "• Dot"], ["dash", "– Dash"], ["none", "None"]] as const).map(([id, name]) => (
              <button key={id} onClick={() => setDesignOpts({ ...designOpts, bulletStyle: id })}
                className={`flex-1 text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] ${designOpts.bulletStyle === id ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}>
                {name}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Contact line</p>
          <div className="flex gap-1.5">
            {([["line", "Single line"], ["stacked", "Stacked"]] as const).map(([id, name]) => (
              <button key={id} onClick={() => setDesignOpts({ ...designOpts, contactStyle: id })}
                className={`flex-1 text-[12px] font-bold px-3 py-2 rounded-full border-[1.5px] min-h-[44px] ${designOpts.contactStyle === id ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"}`}>
                {name}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-2 mb-4 print:hidden">
        <Button variant={editing ? "emerald" : "secondary"} onClick={() => setEditing(!editing)} className="flex-1">
          {editing ? "✓ Done" : "✎ Edit text"}
        </Button>
        <Button variant="secondary" onClick={printExport} className="flex-1">🖨 Print</Button>
      </div>
      {editing && (
        <p className="text-xs text-emerald-900 bg-mint rounded-xl px-3 py-2 mb-4 print:hidden">
          Tap any text in the resume to edit it inline. Changes save automatically.
        </p>
      )}

      <div id="resume-print" className="bg-white rounded-2xl border border-line shadow-sm p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 print:hidden">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${pages <= 2 ? "bg-mint text-emerald-900" : "bg-red-100 text-red-800"}`}>
            {pages <= 2 ? `✓ ${pages} page${pages > 1 ? "s" : ""} — fits the 2-page rule` : `⚠ ~${pages} pages — over the 2-page rule`}
          </span>
          {fitScale < densityBase - 0.001 && (
            <span className="text-[11px] font-semibold text-muted">Auto-fit {Math.round(fitScale * 100)}%</span>
          )}
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold">
            {(["comfortable", "compact"] as const).map((d) => (
              <button key={d} onClick={() => setDensity(d)}
                className={`px-2.5 py-1.5 rounded-md min-h-[44px] ${density === d ? "bg-white shadow-sm text-ink" : "text-slate-600"}`}>
                {d === "comfortable" ? "Comfortable" : "Compact"}
              </button>
            ))}
          </div>
        </div>
        {pages > 2 && (
          <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 print:hidden">
            {fitScale <= FIT_FLOOR + 0.001 ? (
              <>Recruiters skim — even at the smallest readable size this runs ~{pages} pages. Trim older roles to fit 2 pages.</>
            ) : (
              <>Recruiters skim — trim older roles or switch to <b>Compact</b> density to fit 2 pages.</>
            )}
          </p>
        )}
        <div ref={previewRef} style={fitScale < 1 ? { zoom: fitScale } : undefined}>
          {templateId === "custom" ? renderCustom(resume, ed, designOpts) : template.render(resume, ed)}
        </div>
      </div>

      {/* Print-pagination measuring copy: the same template laid out at
          true print width, off-screen and never printed. Its width tracks
          the auto-fit scale (see the measure effect above). */}
      <div aria-hidden className="print:hidden" style={{ position: "fixed", left: 0, top: 0, width: 0, height: 0, overflow: "hidden", visibility: "hidden" }}>
        <div ref={measureRef} style={{ width: PRINT_CONTENT_PX / fitScale }}>
          {templateId === "custom" ? renderCustom(resume, thumbEd, designOpts) : template.render(resume, thumbEd)}
        </div>
      </div>

      {gate === "open" ? (
        <>
          <div className="flex gap-2 mt-4 print:hidden">
            <Button variant="emerald" onClick={printExport} className="flex-1 !min-h-[52px]">
              Export PDF
            </Button>
            <Button variant="secondary" onClick={downloadDocx} disabled={docxBusy} className="flex-1 !min-h-[52px]">
              {docxBusy ? "Preparing…" : "📄 Download .docx"}
            </Button>
          </div>
          {docxError && (
            <p role="alert" className="text-sm text-red-700 font-medium mt-2 print:hidden">{docxError}</p>
          )}

          <Card className="mt-3 print:hidden">
            <p className="text-xs text-muted leading-relaxed">
              <b className="text-ink">PDF tip:</b> tap Export PDF, then choose "Save as PDF" as the destination. Templates use solid colors and standard fonts so they print cleanly from any device.
            </p>
          </Card>
        </>
      ) : (
        <div className="mt-4 print:hidden">
          <ProPrompt feature="PDF & DOCX export" state={gate} />
        </div>
      )}

      <SaveVersionForm className="mt-3" />
    </div>
  );
}
