/**
 * DOCX export — builds a real Word document from the structured resume.
 *
 * The document mirrors the selected template's identity: its accent color,
 * a Word-safe font, its section-heading labels, and its section order
 * (read from lib/templates.tsx; Slate's sidebar content comes first
 * because that is the order its render emits). Everything the templates
 * render is included — name, contact line, summary, experience with
 * bullets, projects, education, skills, certifications, awards — plus the
 * two fields the on-screen templates don't render (project description,
 * education details) so no user text is ever dropped from the export.
 *
 * `buildResumeDocument` is a pure function (StructuredResume + identity →
 * docx Document) so it can be exercised in node; `buildResumeDocxBlob`
 * wraps it with Packer for the browser download.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import { StructuredResume } from "./types";

export type DocxSectionKey =
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "certifications"
  | "awards";

export interface DocxTemplateIdentity {
  templateName: string;
  /** Accent hex, no leading '#'. */
  accent: string;
  /** Word font name for body text. */
  font: string;
  /** Color for the name run; templates that leave the name ink-black use "1A1A1A". */
  nameColor: string;
  nameAlign: "left" | "center";
  /** Draw a rule under each section heading (Classic / Slate / Custom-rule look). */
  headingBorder: boolean;
  /** Design-tab auto-fit type scale (1 = none). Set by buildResumeDocxBlob
   * from the scale the on-screen fit loop settled on, so the DOCX export
   * shrinks its type the same way the preview/print render did. */
  fontScale?: number;
  order: DocxSectionKey[];
  labels: Record<DocxSectionKey, string>;
}

const STANDARD_LABELS: Record<DocxSectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications & Training",
  awards: "Awards & Honors",
};

const STANDARD_ORDER: DocxSectionKey[] = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
  "awards",
];

const SANS = "Calibri";
const SERIF = "Georgia";
const MONO = "Consolas";

const IDENTITIES: Record<string, DocxTemplateIdentity> = {
  classic: {
    templateName: "Classic",
    accent: "1A1A1A",
    font: SERIF,
    nameColor: "1A1A1A",
    nameAlign: "center",
    headingBorder: true,
    order: STANDARD_ORDER,
    labels: STANDARD_LABELS,
  },
  modern: {
    templateName: "Modern",
    accent: "0B6E4F",
    font: SANS,
    nameColor: "0B6E4F",
    nameAlign: "left",
    headingBorder: false,
    order: STANDARD_ORDER,
    labels: STANDARD_LABELS,
  },
  minimal: {
    templateName: "Minimal",
    accent: "808080",
    font: SANS,
    nameColor: "222222",
    nameAlign: "left",
    headingBorder: false,
    order: STANDARD_ORDER,
    labels: STANDARD_LABELS,
  },
  executive: {
    templateName: "Executive",
    accent: "8A6D2F",
    font: SERIF,
    nameColor: "1C1C1C",
    nameAlign: "left",
    headingBorder: false,
    order: STANDARD_ORDER,
    labels: {
      summary: "Executive Summary",
      experience: "Professional Experience",
      projects: "Key Initiatives",
      education: "Education",
      skills: "Core Competencies",
      certifications: "Certifications & Training",
      awards: "Awards & Honors",
    },
  },
  bold: {
    templateName: "Bold",
    accent: "B3261E",
    font: SANS,
    nameColor: "141414",
    nameAlign: "left",
    headingBorder: false,
    order: STANDARD_ORDER,
    labels: STANDARD_LABELS,
  },
  slate: {
    // Slate renders a sidebar (Skills, Education, Certifications, Awards)
    // before the main column (Summary, Experience, Projects) — the DOCX
    // keeps that reading order in a single column.
    templateName: "Slate",
    accent: "1E293B",
    font: SANS,
    nameColor: "1E293B",
    nameAlign: "left",
    headingBorder: true,
    order: ["skills", "education", "certifications", "awards", "summary", "experience", "projects"],
    labels: {
      ...STANDARD_LABELS,
      certifications: "Certifications",
      awards: "Awards",
    },
  },
  ocean: {
    templateName: "Ocean",
    accent: "0A66C2",
    font: SANS,
    nameColor: "0A66C2",
    nameAlign: "center",
    headingBorder: false,
    order: STANDARD_ORDER,
    labels: STANDARD_LABELS,
  },
  mono: {
    templateName: "Mono",
    accent: "1A1A1A",
    font: MONO,
    nameColor: "1A1A1A",
    nameAlign: "left",
    headingBorder: false,
    order: STANDARD_ORDER,
    labels: STANDARD_LABELS,
  },
};

/** Custom Studio font ids (lib/templates.tsx DESIGN_FONTS) → Word-safe names. */
const CUSTOM_FONTS: Record<string, string> = {
  sans: SANS,
  serif: SERIF,
  book: "Palatino Linotype",
  condensed: "Arial Narrow",
  mono: MONO,
  rounded: SANS,
};

export interface CustomDocxOptions {
  /** Hex accent, with or without leading '#'. */
  accent: string;
  /** DesignOptions font id. */
  font: string;
  nameAlign: "left" | "center";
  /** DesignOptions headerStyle id — only "rule" draws a heading rule. */
  headerStyle: string;
}

const hex = (c: string) => c.replace(/^#/, "").toUpperCase();

/** Resolve the DOCX identity for a template id (+ Custom Studio options). */
export function resolveDocxIdentity(templateId: string, custom?: CustomDocxOptions): DocxTemplateIdentity {
  if (templateId === "custom") {
    const accent = custom?.accent ? hex(custom.accent) : "0B6E4F";
    return {
      templateName: "Custom Studio",
      accent,
      font: CUSTOM_FONTS[custom?.font ?? "sans"] ?? SANS,
      nameColor: accent,
      nameAlign: custom?.nameAlign ?? "left",
      headingBorder: (custom?.headerStyle ?? "rule") === "rule",
      order: STANDARD_ORDER,
      labels: STANDARD_LABELS,
    };
  }
  return IDENTITIES[templateId] ?? IDENTITIES.modern;
}

/** "Firstname-Lastname-Resume.docx" from the resume name, filesystem-sanitized. */
export function resumeDocxFileName(resume: StructuredResume): string {
  const base = (resume.name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9'-]/g, ""))
    .filter(Boolean)
    .join("-");
  return base ? `${base}-Resume.docx` : "Resume.docx";
}

const contactLine = (r: StructuredResume) =>
  [r.location, r.phone, r.email, r.linkedin].filter(Boolean).join("  ·  ");

const GRAY = "5B6470";
const BULLETS_REF = "hirecraft-bullets";

/** Auto-fit scaling: font sizes (half-points) and paragraph spacing
 * (twips) shrink by the identity's fontScale. Font sizes keep a floor so
 * scaled type never goes unreadably small. */
const sz = (n: number, id: DocxTemplateIdentity) => Math.max(12, Math.round(n * (id.fontScale ?? 1)));
const sp = (n: number, id: DocxTemplateIdentity) => Math.round(n * (id.fontScale ?? 1));

function headingPara(text: string, id: DocxTemplateIdentity): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: sp(260, id), after: sp(110, id) },
    keepNext: true,
    ...(id.headingBorder
      ? { border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: id.accent, space: 2 } } }
      : {}),
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: sz(24, id), color: id.accent }),
    ],
  });
}

function bulletPara(text: string, id?: DocxTemplateIdentity): Paragraph {
  return new Paragraph({
    numbering: { reference: BULLETS_REF, level: 0 },
    spacing: { after: id ? sp(45, id) : 45 },
    children: [new TextRun({ text })],
  });
}

function sectionParagraphs(key: DocxSectionKey, r: StructuredResume, id: DocxTemplateIdentity): Paragraph[] {
  const out: Paragraph[] = [];
  const head = () => headingPara(id.labels[key], id);
  switch (key) {
    case "summary": {
      if (!r.summary.trim()) return out;
      out.push(head(), new Paragraph({ spacing: { after: sp(80, id) }, children: [new TextRun({ text: r.summary })] }));
      return out;
    }
    case "experience": {
      if (r.experience.length === 0) return out;
      out.push(head());
      for (const e of r.experience) {
        out.push(
          new Paragraph({
            spacing: { before: sp(110, id), after: sp(20, id) },
            keepNext: true,
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: e.title, bold: true }),
              ...(e.company ? [new TextRun({ text: ` — ${e.company}` })] : []),
              ...(e.dates ? [new TextRun({ text: `\t${e.dates}`, color: GRAY, size: sz(21, id) })] : []),
            ],
          }),
        );
        for (const b of e.bullets) if (b.trim()) out.push(bulletPara(b, id));
      }
      return out;
    }
    case "projects": {
      if (r.projects.length === 0) return out;
      out.push(head());
      for (const p of r.projects) {
        out.push(
          new Paragraph({
            spacing: { before: sp(100, id), after: sp(20, id) },
            keepNext: true,
            children: [
              new TextRun({ text: p.name, bold: true }),
              ...(p.tech ? [new TextRun({ text: ` — ${p.tech}`, color: GRAY, size: sz(21, id) })] : []),
            ],
          }),
        );
        if (p.description.trim()) {
          out.push(new Paragraph({ spacing: { after: sp(40, id) }, children: [new TextRun({ text: p.description })] }));
        }
        for (const b of p.bullets) if (b.trim()) out.push(bulletPara(b, id));
      }
      return out;
    }
    case "education": {
      if (r.education.length === 0) return out;
      out.push(head());
      for (const e of r.education) {
        out.push(
          new Paragraph({
            spacing: { after: sp(30, id) },
            children: [
              new TextRun({ text: e.degree, bold: true }),
              ...(e.school ? [new TextRun({ text: ` — ${e.school}` })] : []),
              ...(e.dates ? [new TextRun({ text: `, ${e.dates}`, color: GRAY, size: sz(21, id) })] : []),
            ],
          }),
        );
        if (e.details.trim()) {
          out.push(new Paragraph({ spacing: { after: sp(60, id) }, children: [new TextRun({ text: e.details, color: GRAY, size: sz(21, id) })] }));
        }
      }
      return out;
    }
    case "skills": {
      if (r.skills.length === 0) return out;
      out.push(head(), new Paragraph({ spacing: { after: sp(80, id) }, children: [new TextRun({ text: r.skills.join("  ·  ") })] }));
      return out;
    }
    case "certifications": {
      const certs = r.certifications ?? [];
      if (certs.length === 0) return out;
      out.push(head());
      for (const c of certs) if (c.trim()) out.push(bulletPara(c, id));
      return out;
    }
    case "awards": {
      const awards = r.awards ?? [];
      if (awards.length === 0) return out;
      out.push(head());
      for (const a of awards) if (a.trim()) out.push(bulletPara(a, id));
      return out;
    }
  }
}

/** Pure builder: StructuredResume + template identity → docx Document. */
export function buildResumeDocument(resume: StructuredResume, identity: DocxTemplateIdentity): Document {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: identity.nameAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: sp(30, identity) },
      children: [
        new TextRun({ text: resume.name || "Your Name", bold: true, size: sz(46, identity), color: identity.nameColor }),
      ],
    }),
  ];
  const contact = contactLine(resume);
  if (contact) {
    children.push(
      new Paragraph({
        alignment: identity.nameAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: sp(140, identity) },
        children: [new TextRun({ text: contact, size: sz(21, identity), color: GRAY })],
      }),
    );
  }
  for (const key of identity.order) {
    children.push(...sectionParagraphs(key, resume, identity));
  }

  return new Document({
    creator: "ResumeRoadmap",
    title: `${resume.name || "Resume"} — Resume`,
    description: `Resume exported from ResumeRoadmap (${identity.templateName} template).`,
    styles: {
      default: {
        document: { run: { font: identity.font, size: sz(22, identity), color: "1A1A1A" } },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLETS_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: sp(360, identity), hanging: sp(220, identity) } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter, twips
            margin: { top: 1008, bottom: 1008, left: 1008, right: 1008 }, // 0.7"
          },
        },
        children,
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Cover letter DOCX (Wave 3) — plain professional layout: the letter  */
/* text as paragraphs in a Word-safe font on US Letter. Same file     */
/* name as the .txt download, with a .docx extension.                 */
/* ------------------------------------------------------------------ */

/** Pure builder: cover-letter text → docx Document (paragraphs split on newlines). */
export function buildCoverLetterDocument(text: string): Document {
  const children: Paragraph[] = text.split("\n").map(
    (line) =>
      new Paragraph({
        spacing: { after: line.trim() ? 120 : 60 },
        children: line.trim() ? [new TextRun({ text: line })] : [],
      })
  );
  return new Document({
    creator: "ResumeRoadmap",
    title: "Cover Letter",
    description: "Cover letter exported from ResumeRoadmap.",
    styles: {
      default: {
        document: { run: { font: SANS, size: 22, color: "1A1A1A" } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter, twips
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1"
          },
        },
        children,
      },
    ],
  });
}

/** Browser entry point: build the cover-letter .docx Blob. */
export async function buildCoverLetterDocxBlob(text: string): Promise<Blob> {
  return Packer.toBlob(buildCoverLetterDocument(text));
}

/** Browser entry point: build the .docx Blob for `resume` in template `templateId`.
 * `scale` is the Design tab's auto-fit scale (1/undefined = no shrink). */
export async function buildResumeDocxBlob(
  resume: StructuredResume,
  templateId: string,
  custom?: CustomDocxOptions,
  scale?: number,
): Promise<Blob> {
  const identity = resolveDocxIdentity(templateId, custom);
  const doc = buildResumeDocument(
    resume,
    scale && scale < 1 ? { ...identity, fontScale: scale } : identity,
  );
  return Packer.toBlob(doc);
}
