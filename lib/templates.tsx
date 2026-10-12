import { ReactNode } from "react";
import { StructuredResume } from "./types";

export type EdFn = (value: string, onChange: (v: string) => void, className?: string, multiline?: boolean) => ReactNode;

export interface TemplateDef {
  id: string;
  name: string;
  blurb: string;
  render: (r: StructuredResume, ed: EdFn) => ReactNode;
}

function ContactLine({ r, ed, sep = "  ·  ", className = "" }: { r: StructuredResume; ed: EdFn; sep?: string; className?: string }) {
  const parts: ReactNode[] = [];
  if (r.location) parts.push(ed(r.location, (v) => {}, ""));
  return <>{parts}</>;
}

const contact = (r: StructuredResume) =>
  [r.location, r.phone, r.email, r.linkedin].filter(Boolean).join("  ·  ");

export const TEMPLATES: TemplateDef[] = [
  {
    id: "classic",
    name: "Classic",
    blurb: "Timeless serif. The safe choice for finance, law, and government.",
    render: (r, ed) => (
      <div className="font-serif text-[#1a1a1a] text-[13px] leading-relaxed">
        <div className="text-center border-b-2 border-[#1a1a1a] pb-3 mb-4">
          {ed(r.name || "Your Name", () => {}, "block text-[26px] font-bold tracking-wide")}
          <p className="text-[12px] mt-1 text-[#444]">{contact(r) || "City, ST · phone · email · linkedin"}</p>
        </div>
        {r.summary && (
          <section className="mb-4">
            <h3 className="text-[13px] font-bold tracking-[0.2em] uppercase border-b border-[#999] pb-1 mb-2">Summary</h3>
            {ed(r.summary, () => {}, "block")}
          </section>
        )}
        {r.experience.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[13px] font-bold tracking-[0.2em] uppercase border-b border-[#999] pb-1 mb-2">Experience</h3>
            {r.experience.map((e, i) => (
              <div key={i} className="mb-3">
                <p className="font-bold">{ed(e.title, () => {}, "inline")}{e.company && <span className="font-normal italic"> — {ed(e.company, () => {}, "inline")}</span>}</p>
                {e.dates && <p className="text-[12px] text-[#555]">{ed(e.dates, () => {}, "inline")}</p>}
                <ul className="list-disc ml-5 mt-1">{e.bullets.map((b, j) => <li key={j}>{ed(b, () => {}, "inline")}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {r.projects.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[13px] font-bold tracking-[0.2em] uppercase border-b border-[#999] pb-1 mb-2">Projects</h3>
            {r.projects.map((p, i) => (
              <div key={i} className="mb-2">
                <p className="font-bold">{ed(p.name, () => {}, "inline")}{p.tech && <span className="font-normal text-[12px]"> ({ed(p.tech, () => {}, "inline")})</span>}</p>
                <ul className="list-disc ml-5 mt-1">{p.bullets.map((b, j) => <li key={j}>{ed(b, () => {}, "inline")}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {r.education.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[13px] font-bold tracking-[0.2em] uppercase border-b border-[#999] pb-1 mb-2">Education</h3>
            {r.education.map((e, i) => (
              <p key={i} className="mb-1"><b>{ed(e.degree, () => {}, "inline")}</b> — {ed(e.school, () => {}, "inline")}{e.dates && `, ${e.dates}`}</p>
            ))}
          </section>
        )}
        {r.skills.length > 0 && (
          <section>
            <h3 className="text-[13px] font-bold tracking-[0.2em] uppercase border-b border-[#999] pb-1 mb-2">Skills</h3>
            <p>{r.skills.join("  ·  ")}</p>
          </section>
        )}
      </div>
    ),
  },
  {
    id: "modern",
    name: "Modern",
    blurb: "Clean sans-serif with a confident accent. Great for tech and startups.",
    render: (r, ed) => (
      <div className="text-[#17202a] text-[13px] leading-relaxed" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="mb-4">
          {ed(r.name || "Your Name", () => {}, "block text-[30px] font-extrabold tracking-tight text-[#0B6E4F]")}
          <p className="text-[12px] text-[#5B6470] mt-1">{contact(r) || "City, ST · phone · email · linkedin"}</p>
        </div>
        {r.summary && (
          <section className="mb-4">
            <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B6E4F] mb-1.5">Summary</h3>
            {ed(r.summary, () => {}, "block")}
          </section>
        )}
        {r.experience.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B6E4F] mb-1.5">Experience</h3>
            {r.experience.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between items-baseline gap-2">
                  <p className="font-bold text-[14px]">{ed(e.title, () => {}, "inline")}</p>
                  {e.dates && <p className="text-[12px] text-[#5B6470] whitespace-nowrap">{ed(e.dates, () => {}, "inline")}</p>}
                </div>
                {e.company && <p className="text-[12px] text-[#5B6470] font-medium">{ed(e.company, () => {}, "inline")}</p>}
                <ul className="mt-1 space-y-1">{e.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#0B6E4F] font-bold">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {r.projects.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B6E4F] mb-1.5">Projects</h3>
            {r.projects.map((p, i) => (
              <div key={i} className="mb-2">
                <p className="font-bold text-[14px]">{ed(p.name, () => {}, "inline")}{p.tech && <span className="font-normal text-[12px] text-[#5B6470]"> — {ed(p.tech, () => {}, "inline")}</span>}</p>
                <ul className="mt-1 space-y-1">{p.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#0B6E4F] font-bold">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
              </div>
            ))}
          </section>
        )}
        <div className="grid grid-cols-2 gap-4">
          {r.education.length > 0 && (
            <section>
              <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B6E4F] mb-1.5">Education</h3>
              {r.education.map((e, i) => (
                <p key={i} className="mb-1 text-[12px]"><b>{ed(e.degree, () => {}, "inline")}</b><br />{ed(e.school, () => {}, "inline")}{e.dates && ` · ${e.dates}`}</p>
              ))}
            </section>
          )}
          {r.skills.length > 0 && (
            <section>
              <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B6E4F] mb-1.5">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {r.skills.map((s, i) => (
                  <span key={i} className="text-[12px] font-medium bg-[#0B6E4F]/10 text-[#084E38] rounded-full px-2.5 py-1">{s}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    ),
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "Maximum whitespace. For designers and anyone who hates clutter.",
    render: (r, ed) => (
      <div className="text-[#222] text-[13px] leading-loose" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="mb-6">
          {ed(r.name || "Your Name", () => {}, "block text-[28px] font-light tracking-wide")}
          <p className="text-[12px] text-[#888] mt-1 tracking-wide">{contact(r) || "City, ST · phone · email · linkedin"}</p>
        </div>
        {r.summary && <p className="mb-6 text-[#444] italic">{ed(r.summary, () => {}, "block")}</p>}
        {r.experience.length > 0 && (
          <section className="mb-6">
            {r.experience.map((e, i) => (
              <div key={i} className="mb-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[#999]">{ed(e.dates || "Dates", () => {}, "inline")}</p>
                <p className="text-[16px] font-semibold mt-0.5">{ed(e.title, () => {}, "inline")}</p>
                {e.company && <p className="text-[13px] text-[#666]">{ed(e.company, () => {}, "inline")}</p>}
                <div className="mt-1.5 space-y-1">{e.bullets.map((b, j) => <p key={j} className="text-[#333]">— {ed(b, () => {}, "inline")}</p>)}</div>
              </div>
            ))}
          </section>
        )}
        {r.projects.length > 0 && (
          <section className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#999] mb-2">Projects</p>
            {r.projects.map((p, i) => (
              <div key={i} className="mb-3">
                <p className="text-[15px] font-semibold">{ed(p.name, () => {}, "inline")}</p>
                <div className="space-y-1 mt-1">{p.bullets.map((b, j) => <p key={j} className="text-[#333]">— {ed(b, () => {}, "inline")}</p>)}</div>
              </div>
            ))}
          </section>
        )}
        <div className="border-t border-[#e5e5e5] pt-4 grid gap-4">
          {r.education.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#999] mb-1">Education</p>
              {r.education.map((e, i) => <p key={i} className="text-[13px]"><b>{ed(e.degree, () => {}, "inline")}</b>, {ed(e.school, () => {}, "inline")}{e.dates && ` · ${e.dates}`}</p>)}
            </div>
          )}
          {r.skills.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#999] mb-1">Skills</p>
              <p className="text-[13px] text-[#444]">{r.skills.join("   ·   ")}</p>
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    id: "executive",
    name: "Executive",
    blurb: "Dark header band, authoritative type. For senior roles and leadership.",
    render: (r, ed) => (
      <div className="text-[#1c1c1c] text-[13px] leading-relaxed" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div className="bg-[#1c1c1c] text-white px-6 py-6 -mx-6 -mt-6 mb-5">
          {ed(r.name || "Your Name", () => {}, "block text-[28px] font-bold tracking-wide text-white")}
          <p className="text-[12px] mt-1.5 text-white/70">{contact(r) || "City, ST · phone · email · linkedin"}</p>
        </div>
        {r.summary && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Executive Summary</h3>
            {ed(r.summary, () => {}, "block italic")}
          </section>
        )}
        {r.experience.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Professional Experience</h3>
            {r.experience.map((e, i) => (
              <div key={i} className="mb-3 pb-3 border-b border-[#e8e4d8] last:border-0">
                <div className="flex justify-between items-baseline gap-2">
                  <p className="font-bold text-[15px]">{ed(e.title, () => {}, "inline")}</p>
                  {e.dates && <p className="text-[12px] text-[#777] whitespace-nowrap">{ed(e.dates, () => {}, "inline")}</p>}
                </div>
                {e.company && <p className="italic text-[13px] text-[#555]">{ed(e.company, () => {}, "inline")}</p>}
                <ul className="list-disc ml-5 mt-1.5 space-y-1">{e.bullets.map((b, j) => <li key={j}>{ed(b, () => {}, "inline")}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {r.projects.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Key Initiatives</h3>
            {r.projects.map((p, i) => (
              <div key={i} className="mb-2">
                <p className="font-bold">{ed(p.name, () => {}, "inline")}</p>
                <ul className="list-disc ml-5 mt-1">{p.bullets.map((b, j) => <li key={j}>{ed(b, () => {}, "inline")}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        <div className="grid grid-cols-2 gap-4">
          {r.education.length > 0 && (
            <section>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Education</h3>
              {r.education.map((e, i) => <p key={i} className="text-[13px] mb-1"><b>{ed(e.degree, () => {}, "inline")}</b><br />{ed(e.school, () => {}, "inline")}{e.dates && `, ${e.dates}`}</p>)}
            </section>
          )}
          {r.skills.length > 0 && (
            <section>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Core Competencies</h3>
              <p className="text-[13px]">{r.skills.join("  ·  ")}</p>
            </section>
          )}
        </div>
      </div>
    ),
  },
  {
    id: "bold",
    name: "Bold",
    blurb: "High-contrast accent bar. For sales, marketing, and anyone who leads with energy.",
    render: (r, ed) => (
      <div className="text-[#141414] text-[13px] leading-relaxed" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="flex gap-5">
          <div className="w-2 shrink-0 bg-[#B3261E] rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              {ed(r.name || "Your Name", () => {}, "block text-[32px] font-black tracking-tight uppercase")}
              <p className="text-[12px] font-semibold text-[#B3261E] mt-1">{contact(r) || "City, ST · phone · email · linkedin"}</p>
            </div>
            {r.summary && <p className="mb-4 font-medium text-[14px]">{ed(r.summary, () => {}, "block")}</p>}
            {r.experience.length > 0 && (
              <section className="mb-4">
                <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Experience</h3>
                {r.experience.map((e, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-extrabold text-[14px]">{ed(e.title, () => {}, "inline")} <span className="font-medium text-[#666]">· {ed(e.company || "Company", () => {}, "inline")}</span></p>
                    {e.dates && <p className="text-[12px] text-[#888] font-semibold">{ed(e.dates, () => {}, "inline")}</p>}
                    <ul className="mt-1 space-y-1">{e.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#B3261E]">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
                  </div>
                ))}
              </section>
            )}
            {r.projects.length > 0 && (
              <section className="mb-4">
                <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Projects</h3>
                {r.projects.map((p, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-extrabold">{ed(p.name, () => {}, "inline")}</p>
                    <ul className="mt-1 space-y-1">{p.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#B3261E]">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
                  </div>
                ))}
              </section>
            )}
            <div className="grid grid-cols-2 gap-4">
              {r.education.length > 0 && (
                <div>
                  <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Education</h3>
                  {r.education.map((e, i) => <p key={i} className="text-[13px]"><b>{ed(e.degree, () => {}, "inline")}</b><br />{ed(e.school, () => {}, "inline")}</p>)}
                </div>
              )}
              {r.skills.length > 0 && (
                <div>
                  <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Skills</h3>
                  <p className="text-[13px] font-medium">{r.skills.join("  ·  ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
