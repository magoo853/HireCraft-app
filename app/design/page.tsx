"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { TEMPLATES, EdFn } from "@/lib/templates";
import { structuredToText } from "@/lib/parse";
import { Button, Card, EmptyState, SectionTitle } from "@/components/ui";

const THUMB_ACCENT: Record<string, string> = {
  classic: "#0B3B2E",
  modern: "#0A66C2",
  minimal: "#111111",
  executive: "#7C2D12",
  bold: "#6D28D9",
};

function Thumb({ id }: { id: string }) {
  const accent = THUMB_ACCENT[id] ?? "#0B3B2E";
  return (
    <div className="bg-[#F8FAFC] rounded-md h-[110px] p-2 border border-slate-100">
      <div className="h-2 rounded-full mb-1.5" style={{ background: accent, width: id === "bold" ? "40%" : "60%" }} />
      <div className="h-[5px] rounded-full mb-1.5" style={{ background: accent, width: "40%", opacity: 0.7 }} />
      <div className="h-[5px] rounded-full bg-slate-300 mb-1" style={{ width: "90%" }} />
      <div className="h-[5px] rounded-full bg-slate-300 mb-1" style={{ width: "75%" }} />
      <div className="h-[5px] rounded-full bg-slate-300" style={{ width: "85%" }} />
    </div>
  );
}

export default function DesignPage() {
  const { resume, setResume, hasResume } = useApp();
  const [templateId, setTemplateId] = useState("modern");
  const [editing, setEditing] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [pages, setPages] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  // 2-page guard: estimate printed pages from rendered height vs. US Letter ratio.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => {
      const pageH = el.clientWidth * 11 / 8.5;
      if (pageH > 0) setPages(Math.max(1, Math.ceil(el.scrollHeight / pageH)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [templateId, resume, density]);

  if (!hasResume) {
    return (
      <EmptyState
        title="No resume yet"
        body="Add or build your resume first — then pick from five recruiter-grade designs and export a clean PDF."
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
          if (next !== value) replaceText(value, next);
        }}
      >
        {value}
      </span>
    );
  };

  function replaceText(oldText: string, newText: string) {
    const r = { ...resume };
    let done = false;
    const swap = (s: string) => {
      if (!done && s.includes(oldText)) { done = true; return s.replace(oldText, newText); }
      return s;
    };
    r.summary = swap(r.summary);
    r.name = swap(r.name);
    r.experience = r.experience.map((e) => ({
      ...e,
      title: swap(e.title), company: swap(e.company), dates: swap(e.dates),
      bullets: e.bullets.map(swap),
    }));
    r.projects = r.projects.map((p) => ({
      ...p, name: swap(p.name), description: swap(p.description), tech: swap(p.tech),
      bullets: p.bullets.map(swap),
    }));
    r.education = r.education.map((e) => ({
      ...e, school: swap(e.school), degree: swap(e.degree), dates: swap(e.dates), details: swap(e.details),
    }));
    if (done) {
      r.rawText = structuredToText(r);
      setResume(r);
    }
  }

  return (
    <div>
      <SectionTitle sub="Your content, five ways. Tap to preview — export to PDF when it's perfect.">
        Design
      </SectionTitle>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        {TEMPLATES.slice(0, 4).map((t) => (
          <button key={t.id} onClick={() => setTemplateId(t.id)}
            className={`bg-white rounded-xl border-2 p-2 text-center transition active:scale-[0.98] ${templateId === t.id ? "border-brand" : "border-line"}`}>
            <Thumb id={t.id} />
            <span className="block text-[11.5px] font-bold text-ink mt-1.5">{t.name}{templateId === t.id ? " ✓" : ""}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5 mb-4">
        {TEMPLATES.slice(4).map((t) => (
          <button key={t.id} onClick={() => setTemplateId(t.id)}
            className={`bg-white rounded-xl border-2 p-2 text-center transition active:scale-[0.98] ${templateId === t.id ? "border-brand" : "border-line"}`}>
            <div className="bg-[#F8FAFC] rounded-md h-16 p-2 border border-slate-100">
              <div className="h-2 rounded-full mb-1.5" style={{ background: THUMB_ACCENT[t.id], width: "40%" }} />
              <div className="h-[5px] rounded-full bg-slate-300" style={{ width: "80%" }} />
            </div>
            <span className="block text-[11.5px] font-bold text-ink mt-1.5">{t.name}{templateId === t.id ? " ✓" : ""}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mb-4"><b className="text-ink">{template.name}.</b> {template.blurb}</p>

      <div className="flex gap-2 mb-4 print:hidden">
        <Button variant={editing ? "emerald" : "secondary"} onClick={() => setEditing(!editing)} className="flex-1">
          {editing ? "✓ Done" : "✎ Edit text"}
        </Button>
        <Button variant="secondary" onClick={() => window.print()} className="flex-1">🖨 Print</Button>
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
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold">
            {(["comfortable", "compact"] as const).map((d) => (
              <button key={d} onClick={() => setDensity(d)}
                className={`px-2.5 py-1.5 rounded-md min-h-[36px] ${density === d ? "bg-white shadow-sm text-ink" : "text-muted"}`}>
                {d === "comfortable" ? "Comfortable" : "Compact"}
              </button>
            ))}
          </div>
        </div>
        {pages > 2 && (
          <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 print:hidden">
            Recruiters skim — trim older roles or switch to <b>Compact</b> density to fit 2 pages.
          </p>
        )}
        <div ref={previewRef} style={density === "compact" ? { zoom: 0.88 } : undefined}>
          {template.render(resume, ed)}
        </div>
      </div>

      <Button variant="emerald" onClick={() => window.print()} className="w-full mt-4 !min-h-[52px] print:hidden">
        Export PDF
      </Button>

      <Card className="mt-3 print:hidden">
        <p className="text-xs text-muted leading-relaxed">
          <b className="text-ink">PDF tip:</b> tap Export PDF, then choose "Save as PDF" as the destination. Templates use solid colors and standard fonts so they print cleanly from any device.
        </p>
      </Card>
    </div>
  );
}
