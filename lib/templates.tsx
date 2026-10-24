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

/* ------------------------------------------------------------------ */
/* Skills flow: in full-width sections the skills/competencies items   */
/* render as one dot-separated flow. With 6+ items that single flow    */
/* eats vertical space while the rest of the page sits empty, so the  */
/* items split into two columns — a contiguous first part down the    */
/* left column, the remainder down the right (standard resume reading */
/* order). The split point balances cumulative text length rather     */
/* than raw count, so the columns come out even when the early items  */
/* are systematically longer than the late ones. Each item stays a     */
/* single unit inside one column — it can wrap within its column but  */
/* never straddles the split — and each column carries break-inside:  */
/* avoid so print never cuts an item across pages. Below 6 items       */
/* callers keep their legacy single-flow rendering.                    */
/* ------------------------------------------------------------------ */

export const SKILLS_TWO_COL_MIN = 6;

function SkillColumns({ skills, sep, className = "", renderItem }: {
  skills: string[];
  sep: string;
  className?: string;
  renderItem?: (s: string) => ReactNode;
}) {
  const render = renderItem ?? ((s: string) => s);
  const total = skills.reduce((a, s) => a + s.length + 2, 0);
  let mid = Math.ceil(skills.length / 2);
  let acc = 0;
  let best = Infinity;
  for (let i = 1; i < skills.length; i++) {
    acc += skills[i - 1].length + 2;
    const d = Math.abs(total - 2 * acc);
    if (d < best) { best = d; mid = i; }
  }
  const cols = [skills.slice(0, mid), skills.slice(mid)];
  return (
    <div className={`grid grid-cols-2 gap-x-6 hc-skills-cols ${className}`}>
      {cols.map((col, ci) => (
        <div key={ci} className="[break-inside:avoid]">
          {col.map((s, i) => (
            <span key={i}>
              <span className="hc-skill-unit">{render(s)}</span>
              {i < col.length - 1 ? sep : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "classic",
    name: "Classic",
    blurb: "Timeless serif. The safe choice for finance, law, and government.",
    render: (r, ed) => (
      <div className="hc-doc font-serif text-[#1a1a1a] text-[13px] leading-relaxed">
        <div className="text-center border-b-2 border-[#1a1a1a] pb-3 mb-4">
          {ed(r.name || "Your Name", () => {}, "block text-[24px] font-bold tracking-wide")}
          <p className="text-[12px] mt-1 text-[#444] [overflow-wrap:anywhere]">{contact(r) || "City, ST · phone · email · linkedin"}</p>
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
            {r.skills.length >= SKILLS_TWO_COL_MIN ? (
              <SkillColumns skills={r.skills} sep={"  ·  "} />
            ) : (
              <p>{r.skills.join("  ·  ")}</p>
            )}
          </section>
        )}
        {(r.certifications ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[13px] font-bold tracking-[0.2em] uppercase border-b border-[#999] pb-1 mb-2">Certifications & Training</h3>
            <ul className="list-disc ml-5">{(r.certifications ?? []).map((c, i) => <li key={i}>{ed(c, () => {}, "inline")}</li>)}</ul>
          </section>
        )}
        {(r.awards ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[13px] font-bold tracking-[0.2em] uppercase border-b border-[#999] pb-1 mb-2">Awards & Honors</h3>
            <ul className="list-disc ml-5">{(r.awards ?? []).map((a, i) => <li key={i}>{ed(a, () => {}, "inline")}</li>)}</ul>
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
      <div className="hc-doc text-[#17202a] text-[13px] leading-relaxed" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="mb-4">
          {ed(r.name || "Your Name", () => {}, "block text-[24px] font-extrabold tracking-tight text-[#0B6E4F]")}
          <p className="text-[12px] text-[#5B6470] mt-1 [overflow-wrap:anywhere]">{contact(r) || "City, ST · phone · email · linkedin"}</p>
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
        {(r.certifications ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B6E4F] mb-1.5">Certifications & Training</h3>
            <ul className="space-y-1">{(r.certifications ?? []).map((c, i) => <li key={i} className="flex gap-2"><span className="text-[#0B6E4F] font-bold">▸</span><span>{ed(c, () => {}, "inline")}</span></li>)}</ul>
          </section>
        )}
        {(r.awards ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B6E4F] mb-1.5">Awards & Honors</h3>
            <ul className="space-y-1">{(r.awards ?? []).map((a, i) => <li key={i} className="flex gap-2"><span className="text-[#0B6E4F] font-bold">▸</span><span>{ed(a, () => {}, "inline")}</span></li>)}</ul>
          </section>
        )}
      </div>
    ),
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "Maximum whitespace. For designers and anyone who hates clutter.",
    render: (r, ed) => (
      <div className="hc-doc text-[#222] text-[13px] leading-loose" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="mb-6">
          {ed(r.name || "Your Name", () => {}, "block text-[24px] font-light tracking-wide")}
          <p className="text-[12px] text-[#888] mt-1 tracking-wide [overflow-wrap:anywhere]">{contact(r) || "City, ST · phone · email · linkedin"}</p>
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
              {r.skills.length >= SKILLS_TWO_COL_MIN ? (
                <SkillColumns skills={r.skills} sep={"   ·   "} className="text-[13px] text-[#444]" />
              ) : (
                <p className="text-[13px] text-[#444]">{r.skills.join("   ·   ")}</p>
              )}
            </div>
          )}
          {(r.certifications ?? []).length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#999] mb-1">Certifications & Training</p>
              {(r.certifications ?? []).map((c, i) => <p key={i} className="text-[13px] text-[#333]">— {ed(c, () => {}, "inline")}</p>)}
            </div>
          )}
          {(r.awards ?? []).length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#999] mb-1">Awards & Honors</p>
              {(r.awards ?? []).map((a, i) => <p key={i} className="text-[13px] text-[#333]">— {ed(a, () => {}, "inline")}</p>)}
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
      <div className="hc-doc text-[#1c1c1c] text-[13px] leading-relaxed" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <div className="bg-[#1c1c1c] text-white px-6 py-6 -mx-6 -mt-6 mb-5">
          {ed(r.name || "Your Name", () => {}, "block text-[24px] font-bold tracking-wide text-white")}
          <p className="text-[12px] mt-1.5 text-white/70 [overflow-wrap:anywhere]">{contact(r) || "City, ST · phone · email · linkedin"}</p>
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
          {r.skills.length > 0 && r.skills.length < SKILLS_TWO_COL_MIN && (
            <section>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Core Competencies</h3>
              <p className="text-[13px]">{r.skills.join("  ·  ")}</p>
            </section>
          )}
        </div>
        {r.skills.length >= SKILLS_TWO_COL_MIN && (
          <section className={r.education.length > 0 ? "mt-4" : ""}>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Core Competencies</h3>
            <SkillColumns skills={r.skills} sep={"  ·  "} className="text-[13px]" />
          </section>
        )}
        {(r.certifications ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Certifications & Training</h3>
            <ul className="list-disc ml-5 space-y-1">{(r.certifications ?? []).map((c, i) => <li key={i}>{ed(c, () => {}, "inline")}</li>)}</ul>
          </section>
        )}
        {(r.awards ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f] mb-1.5">Awards & Honors</h3>
            <ul className="list-disc ml-5 space-y-1">{(r.awards ?? []).map((a, i) => <li key={i}>{ed(a, () => {}, "inline")}</li>)}</ul>
          </section>
        )}
      </div>
    ),
  },
  {
    id: "bold",
    name: "Bold",
    blurb: "High-contrast accent bar. For sales, marketing, and anyone who leads with energy.",
    render: (r, ed) => (
      <div className="hc-doc text-[#141414] text-[13px] leading-relaxed" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="flex gap-5">
          <div className="w-2 shrink-0 bg-[#B3261E] rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              {ed(r.name || "Your Name", () => {}, "block text-[24px] font-black tracking-tight uppercase")}
              <p className="text-[12px] font-semibold text-[#B3261E] mt-1 [overflow-wrap:anywhere]">{contact(r) || "City, ST · phone · email · linkedin"}</p>
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
              {r.skills.length > 0 && r.skills.length < SKILLS_TWO_COL_MIN && (
                <div>
                  <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Skills</h3>
                  <p className="text-[13px] font-medium">{r.skills.join("  ·  ")}</p>
                </div>
              )}
            </div>
            {r.skills.length >= SKILLS_TWO_COL_MIN && (
              <div className={r.education.length > 0 ? "mt-4" : ""}>
                <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Skills</h3>
                <SkillColumns skills={r.skills} sep={"  ·  "} className="text-[13px] font-medium" />
              </div>
            )}
            {(r.certifications ?? []).length > 0 && (
              <section className="mt-4">
                <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Certifications & Training</h3>
                <ul className="space-y-1">{(r.certifications ?? []).map((c, i) => <li key={i} className="flex gap-2"><span className="text-[#B3261E]">▸</span><span>{ed(c, () => {}, "inline")}</span></li>)}</ul>
              </section>
            )}
            {(r.awards ?? []).length > 0 && (
              <section className="mt-4">
                <h3 className="inline-block bg-[#141414] text-white text-[11px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-2">Awards & Honors</h3>
                <ul className="space-y-1">{(r.awards ?? []).map((a, i) => <li key={i} className="flex gap-2"><span className="text-[#B3261E]">▸</span><span>{ed(a, () => {}, "inline")}</span></li>)}</ul>
              </section>
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "slate",
    name: "Slate",
    blurb: "Dark sidebar, light content — modern and memorable, still ATS-clean.",
    render: (r, ed) => (
      <div className="hc-doc text-[13px] leading-relaxed text-[#1e293b]" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="flex rounded-lg overflow-hidden">
          <div className="w-[34%] bg-[#1e293b] text-white p-5 shrink-0">
            {ed(r.name || "Your Name", () => {}, "block text-[20px] font-extrabold leading-tight")}
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed [overflow-wrap:anywhere]">{contact(r) || "City, ST · phone · email"}</p>
            {r.skills.length > 0 && (
              <div className="mt-5">
                <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300 mb-2">Skills</h3>
                <ul className="space-y-1">{r.skills.map((s, i) => <li key={i} className="text-[12px]">{ed(s, () => {}, "inline")}</li>)}</ul>
              </div>
            )}
            {r.education.length > 0 && (
              <div className="mt-5">
                <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300 mb-2">Education</h3>
                {r.education.map((e, i) => (
                  <p key={i} className="mb-2 text-[12px]"><b>{ed(e.degree, () => {}, "inline")}</b><br /><span className="text-slate-300">{ed(e.school, () => {}, "inline")}</span></p>
                ))}
              </div>
            )}
            {(r.certifications ?? []).length > 0 && (
              <div className="mt-5">
                <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300 mb-2">Certifications</h3>
                <ul className="space-y-1">{(r.certifications ?? []).map((c, i) => <li key={i} className="text-[12px]">{ed(c, () => {}, "inline")}</li>)}</ul>
              </div>
            )}
            {(r.awards ?? []).length > 0 && (
              <div className="mt-5">
                <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300 mb-2">Awards</h3>
                <ul className="space-y-1">{(r.awards ?? []).map((a, i) => <li key={i} className="text-[12px]">{ed(a, () => {}, "inline")}</li>)}</ul>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 p-5">
            {r.summary && (
              <section className="mb-4">
                <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#1e293b] mb-1.5 border-b border-slate-200 pb-1">Summary</h3>
                {ed(r.summary, () => {}, "block")}
              </section>
            )}
            {r.experience.length > 0 && (
              <section className="mb-4">
                <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#1e293b] mb-1.5 border-b border-slate-200 pb-1">Experience</h3>
                {r.experience.map((e, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between items-baseline gap-2">
                      <p className="font-bold text-[14px]">{ed(e.title, () => {}, "inline")}</p>
                      {e.dates && <p className="text-[12px] text-[#64748b] whitespace-nowrap">{ed(e.dates, () => {}, "inline")}</p>}
                    </div>
                    {e.company && <p className="text-[12px] text-[#64748b] font-medium">{ed(e.company, () => {}, "inline")}</p>}
                    <ul className="mt-1 space-y-1">{e.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#1e293b] font-bold">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
                  </div>
                ))}
              </section>
            )}
            {r.projects.length > 0 && (
              <section>
                <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#1e293b] mb-1.5 border-b border-slate-200 pb-1">Projects</h3>
                {r.projects.map((p, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-bold text-[14px]">{ed(p.name, () => {}, "inline")}{p.tech && <span className="font-normal text-[12px] text-[#64748b]"> — {ed(p.tech, () => {}, "inline")}</span>}</p>
                    <ul className="mt-1 space-y-1">{p.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#1e293b] font-bold">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "ocean",
    name: "Ocean",
    blurb: "Centered header, ocean-blue accents — polished and personable.",
    render: (r, ed) => (
      <div className="hc-doc text-[#14324a] text-[13px] leading-relaxed" style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="text-center mb-4">
          {ed(r.name || "Your Name", () => {}, "block text-[24px] font-extrabold tracking-tight text-[#0A66C2]")}
          <p className="text-[12px] text-[#5B7a99] mt-1 [overflow-wrap:anywhere]">{contact(r) || "City, ST · phone · email · linkedin"}</p>
        </div>
        {r.summary && (
          <section className="mb-4">
            <h3 className="text-center text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-1.5">Summary</h3>
            {ed(r.summary, () => {}, "block text-center")}
          </section>
        )}
        {r.experience.length > 0 && (
          <section className="mb-4">
            <h3 className="text-center text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-2">Experience</h3>
            {r.experience.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between items-baseline gap-2">
                  <p className="font-bold text-[14px]">{ed(e.title, () => {}, "inline")}</p>
                  {e.dates && <p className="text-[12px] text-[#5B7a99] whitespace-nowrap">{ed(e.dates, () => {}, "inline")}</p>}
                </div>
                {e.company && <p className="text-[12px] text-[#0A66C2] font-semibold">{ed(e.company, () => {}, "inline")}</p>}
                <ul className="mt-1 space-y-1">{e.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#0A66C2] font-bold">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {r.projects.length > 0 && (
          <section className="mb-4">
            <h3 className="text-center text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-2">Projects</h3>
            {r.projects.map((p, i) => (
              <div key={i} className="mb-2">
                <p className="font-bold text-[14px]">{ed(p.name, () => {}, "inline")}{p.tech && <span className="font-normal text-[12px] text-[#5B7a99]"> — {ed(p.tech, () => {}, "inline")}</span>}</p>
                <ul className="mt-1 space-y-1">{p.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-[#0A66C2] font-bold">▸</span><span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
              </div>
            ))}
          </section>
        )}
        <div className="grid grid-cols-2 gap-4">
          {r.education.length > 0 && (
            <section>
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-1.5">Education</h3>
              {r.education.map((e, i) => (
                <p key={i} className="mb-1 text-[12px]"><b>{ed(e.degree, () => {}, "inline")}</b><br />{ed(e.school, () => {}, "inline")}{e.dates && ` · ${e.dates}`}</p>
              ))}
            </section>
          )}
          {r.skills.length > 0 && r.skills.length < SKILLS_TWO_COL_MIN && (
            <section>
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-1.5">Skills</h3>
              <p className="text-[12px]">{r.skills.map((s, i) => <span key={i}>{ed(s, () => {}, "inline")}{i < r.skills.length - 1 ? "  ·  " : ""}</span>)}</p>
            </section>
          )}
        </div>
        {r.skills.length >= SKILLS_TWO_COL_MIN && (
          <section className={r.education.length > 0 ? "mt-4" : ""}>
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-1.5">Skills</h3>
            <SkillColumns skills={r.skills} renderItem={(s) => ed(s, () => {}, "inline")} sep={"  ·  "} className="text-[12px]" />
          </section>
        )}
        {(r.certifications ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-1.5">Certifications & Training</h3>
            <ul className="space-y-1">{(r.certifications ?? []).map((c, i) => <li key={i} className="flex gap-2"><span className="text-[#0A66C2] font-bold">▸</span><span>{ed(c, () => {}, "inline")}</span></li>)}</ul>
          </section>
        )}
        {(r.awards ?? []).length > 0 && (
          <section className="mt-4">
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-[#0A66C2] mb-1.5">Awards & Honors</h3>
            <ul className="space-y-1">{(r.awards ?? []).map((a, i) => <li key={i} className="flex gap-2"><span className="text-[#0A66C2] font-bold">▸</span><span>{ed(a, () => {}, "inline")}</span></li>)}</ul>
          </section>
        )}
      </div>
    ),
  },
  {
    id: "mono",
    name: "Mono",
    blurb: "Typewriter type, zero decoration — for engineers and purists.",
    render: (r, ed) => (
      <div className="hc-doc text-[#1a1a1a] text-[12.5px] leading-relaxed" style={{ fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>
        <div className="mb-4">
          {ed(r.name || "Your Name", () => {}, "block text-[22px] font-bold")}
          <p className="text-[12px] text-[#555] mt-1 [overflow-wrap:anywhere]">{contact(r) || "City, ST | phone | email | linkedin"}</p>
          <p className="text-[#999] mt-2">{"=".repeat(52)}</p>
        </div>
        {r.summary && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold mb-1.5">## SUMMARY</h3>
            {ed(r.summary, () => {}, "block")}
          </section>
        )}
        {r.experience.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold mb-1.5">## EXPERIENCE</h3>
            {r.experience.map((e, i) => (
              <div key={i} className="mb-3">
                <p className="font-bold">{ed(e.title, () => {}, "inline")}{e.dates && `  [${e.dates}]`}</p>
                {e.company && <p className="text-[#555]">{ed(e.company, () => {}, "inline")}</p>}
                <ul className="mt-1 space-y-1">{e.bullets.map((b, j) => <li key={j}>- {ed(b, () => {}, "inline")}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {r.projects.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold mb-1.5">## PROJECTS</h3>
            {r.projects.map((p, i) => (
              <div key={i} className="mb-2">
                <p className="font-bold">{ed(p.name, () => {}, "inline")}{p.tech && ` (${p.tech})`}</p>
                <ul className="mt-1 space-y-1">{p.bullets.map((b, j) => <li key={j}>- {ed(b, () => {}, "inline")}</li>)}</ul>
              </div>
            ))}
          </section>
        )}
        {r.education.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold mb-1.5">## EDUCATION</h3>
            {r.education.map((e, i) => (
              <p key={i} className="mb-1"><b>{ed(e.degree, () => {}, "inline")}</b> — {ed(e.school, () => {}, "inline")}{e.dates && ` [${e.dates}]`}</p>
            ))}
          </section>
        )}
        {r.skills.length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold mb-1.5">## SKILLS</h3>
            {r.skills.length >= SKILLS_TWO_COL_MIN ? (
              <SkillColumns skills={r.skills} sep={" | "} />
            ) : (
              <p>{r.skills.join(" | ")}</p>
            )}
          </section>
        )}
        {(r.certifications ?? []).length > 0 && (
          <section className="mb-4">
            <h3 className="text-[12px] font-bold mb-1.5">## CERTIFICATIONS & TRAINING</h3>
            <ul className="space-y-1">{(r.certifications ?? []).map((c, i) => <li key={i}>- {ed(c, () => {}, "inline")}</li>)}</ul>
          </section>
        )}
        {(r.awards ?? []).length > 0 && (
          <section>
            <h3 className="text-[12px] font-bold mb-1.5">## AWARDS & HONORS</h3>
            <ul className="space-y-1">{(r.awards ?? []).map((a, i) => <li key={i}>- {ed(a, () => {}, "inline")}</li>)}</ul>
          </section>
        )}
      </div>
    ),
  },
  {
    id: "custom",
    name: "Custom Studio",
    blurb: "Your colors, your fonts — our locked-in formatting. Make it yours.",
    render: (r, ed) => renderCustom(r, ed, DEFAULT_DESIGN_OPTIONS),
  },
];

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/* ------------------------------------------------------------------ */
/* Custom design studio                                                */
/* ------------------------------------------------------------------ */

export interface DesignOptions {
  accent: string;
  font: "sans" | "serif" | "mono" | "rounded" | "book" | "condensed";
  headerStyle: "rule" | "block" | "plain" | "banner" | "side";
  nameAlign: "left" | "center";
  nameSize: "standard" | "large";
  skillsStyle: "pills" | "list" | "columns";
  bulletStyle: "arrow" | "dot" | "dash" | "none";
  contactStyle: "line" | "stacked";
  spacing: "relaxed" | "standard" | "tight";
}

export const DESIGN_ACCENTS = [
  "#0B6E4F", "#0A66C2", "#6D28D9", "#B3261E",
  "#0E7490", "#BE5A0E", "#1e293b", "#4D7C0F",
  "#9D2246", "#0F766E", "#A16207", "#3730A3",
];

export const DESIGN_FONTS: { id: DesignOptions["font"]; name: string; stack: string }[] = [
  { id: "sans", name: "Clean", stack: "-apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: "serif", name: "Classic", stack: "Georgia, 'Times New Roman', serif" },
  { id: "book", name: "Book", stack: "'Palatino Linotype', Palatino, Georgia, serif" },
  { id: "condensed", name: "Condensed", stack: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif" },
  { id: "mono", name: "Typewriter", stack: "'SF Mono', Menlo, Consolas, monospace" },
  { id: "rounded", name: "Friendly", stack: "ui-rounded, 'SF Pro Rounded', 'Segoe UI', sans-serif" },
];

export const DESIGN_HEADERS: { id: DesignOptions["headerStyle"]; name: string }[] = [
  { id: "rule", name: "Underline" },
  { id: "block", name: "Badge" },
  { id: "banner", name: "Banner" },
  { id: "side", name: "Side bar" },
  { id: "plain", name: "Minimal" },
];

export const DEFAULT_DESIGN_OPTIONS: DesignOptions = {
  accent: "#0B6E4F",
  font: "sans",
  headerStyle: "rule",
  nameAlign: "left",
  nameSize: "standard",
  skillsStyle: "pills",
  bulletStyle: "arrow",
  contactStyle: "line",
  spacing: "standard",
};

/** User-customized template: their colors/fonts, our locked-in formatting. */
export function renderCustom(r: StructuredResume, ed: EdFn, opts: DesignOptions): ReactNode {
  const fontFamily = DESIGN_FONTS.find((f) => f.id === opts.font)?.stack ?? DESIGN_FONTS[0].stack;
  const accent = opts.accent;
  const align = opts.nameAlign === "center" ? "text-center" : "text-left";
  const secMb = opts.spacing === "relaxed" ? "mb-5" : opts.spacing === "tight" ? "mb-3" : "mb-4";
  const entryMb = opts.spacing === "relaxed" ? "mb-4" : opts.spacing === "tight" ? "mb-2" : "mb-3";
  const bulletGap = opts.spacing === "tight" ? "space-y-0.5" : "space-y-1";
  const SecHead = ({ children }: { children: string }) =>
    opts.headerStyle === "block" ? (
      <h3 className="inline-block text-white text-[11px] font-extrabold uppercase tracking-[0.18em] px-3 py-1.5 rounded mb-2" style={{ background: accent }}>{children}</h3>
    ) : opts.headerStyle === "banner" ? (
      <h3 className="block text-white text-[11px] font-extrabold uppercase tracking-[0.18em] px-3 py-1.5 rounded mb-2" style={{ background: accent }}>{children}</h3>
    ) : opts.headerStyle === "side" ? (
      <h3 className="text-[12px] font-extrabold uppercase tracking-widest mb-1.5 pl-2" style={{ color: accent, borderLeft: `4px solid ${accent}` }}>{children}</h3>
    ) : opts.headerStyle === "plain" ? (
      <h3 className="text-[12px] font-bold uppercase tracking-widest text-[#64748b] mb-1.5">{children}</h3>
    ) : (
      <h3 className="text-[12px] font-extrabold uppercase tracking-widest mb-1.5 border-b pb-1" style={{ color: accent, borderColor: `${accent}55` }}>{children}</h3>
    );
  const mark = opts.bulletStyle === "dot" ? "•" : opts.bulletStyle === "dash" ? "–" : opts.bulletStyle === "none" ? "" : "▸";
  const bulletMark = mark ? <span className="font-bold shrink-0" style={{ color: accent }}>{mark}</span> : null;
  const contactLine = contact(r) || "City, ST · phone · email · linkedin";
  const nameCls = opts.nameSize === "large" ? "text-[30px]" : "text-[24px]";
  return (
    <div className="hc-doc text-[#1a1a1a] text-[13px] leading-relaxed" style={{ fontFamily }}>
      <div className={`mb-4 ${align}`}>
        <span style={{ color: accent }}>
          {ed(r.name || "Your Name", () => {}, `block ${nameCls} font-extrabold tracking-tight`)}
        </span>
        {opts.contactStyle === "stacked" ? (
          <div className="text-[12px] text-[#5B6470] mt-1">
            {contactLine.split("·").map((part, i) => (
              <span key={i} className="block [overflow-wrap:anywhere]">{part.trim()}</span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[#5B6470] mt-1 [overflow-wrap:anywhere]">{contactLine}</p>
        )}
      </div>
      {r.summary && (
        <section className={secMb}><SecHead>Summary</SecHead>{ed(r.summary, () => {}, "block")}</section>
      )}
      {r.experience.length > 0 && (
        <section className={secMb}><SecHead>Experience</SecHead>
          {r.experience.map((e, i) => (
            <div key={i} className={entryMb}>
              <div className="flex justify-between items-baseline gap-2">
                <p className="font-bold text-[14px]">{ed(e.title, () => {}, "inline")}</p>
                {e.dates && <p className="text-[12px] text-[#5B6470] whitespace-nowrap">{ed(e.dates, () => {}, "inline")}</p>}
              </div>
              {e.company && <p className="text-[12px] text-[#5B6470] font-medium">{ed(e.company, () => {}, "inline")}</p>}
              <ul className={`mt-1 ${bulletGap}`}>{e.bullets.map((b, j) => <li key={j} className="flex gap-2">{bulletMark}<span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
            </div>
          ))}
        </section>
      )}
      {r.projects.length > 0 && (
        <section className={secMb}><SecHead>Projects</SecHead>
          {r.projects.map((p, i) => (
            <div key={i} className="mb-2">
              <p className="font-bold text-[14px]">{ed(p.name, () => {}, "inline")}{p.tech && <span className="font-normal text-[12px] text-[#5B6470]"> — {ed(p.tech, () => {}, "inline")}</span>}</p>
              <ul className={`mt-1 ${bulletGap}`}>{p.bullets.map((b, j) => <li key={j} className="flex gap-2">{bulletMark}<span>{ed(b, () => {}, "inline")}</span></li>)}</ul>
            </div>
          ))}
        </section>
      )}
      <div className="grid grid-cols-2 gap-4">
        {r.education.length > 0 && (
          <section><SecHead>Education</SecHead>
            {r.education.map((e, i) => (
              <p key={i} className="mb-1 text-[12px]"><b>{ed(e.degree, () => {}, "inline")}</b><br />{ed(e.school, () => {}, "inline")}{e.dates && ` · ${e.dates}`}</p>
            ))}
          </section>
        )}
        {r.skills.length > 0 && !(opts.skillsStyle === "list" && r.skills.length >= SKILLS_TWO_COL_MIN) && (
          <section><SecHead>Skills</SecHead>
            {opts.skillsStyle === "list" ? (
              <p className="text-[12px]">{r.skills.join(" · ")}</p>
            ) : opts.skillsStyle === "columns" ? (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                {r.skills.map((s, i) => (
                  <li key={i} className="flex gap-1.5"><span style={{ color: accent }}>•</span>{s}</li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {r.skills.map((s, i) => (
                  <span key={i} className="text-[12px] font-medium rounded-full px-2.5 py-1" style={{ background: `${accent}1a`, color: accent }}>{s}</span>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      {opts.skillsStyle === "list" && r.skills.length >= SKILLS_TWO_COL_MIN && (
        <section className={secMb}><SecHead>Skills</SecHead>
          <SkillColumns skills={r.skills} sep={" · "} className="text-[12px]" />
        </section>
      )}
      {(r.certifications ?? []).length > 0 && (
        <section className={secMb}><SecHead>Certifications & Training</SecHead>
          <ul className={bulletGap}>{(r.certifications ?? []).map((c, i) => <li key={i} className="flex gap-2">{bulletMark}<span>{ed(c, () => {}, "inline")}</span></li>)}</ul>
        </section>
      )}
      {(r.awards ?? []).length > 0 && (
        <section><SecHead>Awards & Honors</SecHead>
          <ul className={bulletGap}>{(r.awards ?? []).map((a, i) => <li key={i} className="flex gap-2">{bulletMark}<span>{ed(a, () => {}, "inline")}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
