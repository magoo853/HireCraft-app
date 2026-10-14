"use client";

import { useRef, useState } from "react";
import { Button, Card } from "./ui";

/**
 * Shareable before/after score-jump card (Wave 3, backlog #4) — the
 * brand card from the social package (pine #0B3B2E, big numerals,
 * grade chips) rendered as inline SVG from the user's real measured
 * scores. Share uses the Web Share API with a PNG file when the
 * platform supports it; "Download PNG" is the fallback. The PNG is
 * rendered locally (SVG → Image → canvas → blob) — no new dependencies.
 */

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#059669";
    case "B": return "#10B981";
    case "C": return "#D97706";
    case "D": return "#DC2626";
    default: return "#991B1B";
  }
}

export function ScoreJumpCard({
  beforeTotal, beforeGrade, afterTotal, afterGrade, basis,
}: {
  beforeTotal: number;
  beforeGrade: string;
  afterTotal: number;
  afterGrade: string;
  basis?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [msg, setMsg] = useState("");
  const delta = afterTotal - beforeTotal;

  async function toPngBlob(): Promise<Blob | null> {
    const svg = svgRef.current;
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgUrl = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("render failed"));
        img.src = svgUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, 1080, 1080);
      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  function download(blob: Blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "roadmapresume-score-jump.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function shareCard() {
    setMsg("");
    try {
      const blob = await toPngBlob();
      if (!blob) throw new Error("render failed");
      const file = new File([blob], "roadmapresume-score-jump.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (typeof nav.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "My RoadmapResume score jump", text: `My resume score went ${beforeTotal} → ${afterTotal} with RoadmapResume.` });
      } else {
        download(blob);
        setMsg("Sharing isn't available here — the PNG downloaded instead.");
      }
    } catch {
      setMsg("Couldn't share that — try Download PNG below.");
    }
  }

  async function downloadPng() {
    setMsg("");
    try {
      const blob = await toPngBlob();
      if (!blob) throw new Error("render failed");
      download(blob);
    } catch {
      setMsg("Couldn't render the PNG — your scores above are still saved in Your progress.");
    }
  }

  const font = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return (
    <Card className="mb-3">
      <p className="font-bold text-ink text-sm mb-1">Your score jump 🎉</p>
      <p className="text-xs text-muted leading-snug mb-3">
        {beforeTotal} ({beforeGrade}) → {afterTotal} ({afterGrade}) — a real, measured jump. Share it.
      </p>
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080"
        role="img" aria-label={`ATS score before ${beforeTotal} grade ${beforeGrade}, after ${afterTotal} grade ${afterGrade}`}
        className="w-full h-auto rounded-xl border border-line" style={{ maxWidth: 360 }}>
        <rect width="1080" height="1080" fill="#F8FAFC" />
        <g transform="translate(64,64)">
          <rect width="96" height="96" rx="28" fill="#0B3B2E" />
          <clipPath id="sc-rr-clip"><rect width="96" height="96" rx="28" /></clipPath>
          <g clipPath="url(#sc-rr-clip)">
            <polygon points="28.8,96 67.2,96 51.2,51.2 44.8,51.2" fill="#10503C" />
            <polygon points="46.8,80 49.2,80 49,91.2 47,91.2" fill="#0B3B2E" />
            <polygon points="47.1,67.2 48.9,67.2 48.7,76 47.3,76" fill="#0B3B2E" />
            <polygon points="47.4,56.8 48.6,56.8 48.6,63.2 47.4,63.2" fill="#0B3B2E" />
          </g>
          <text x="10.8" y="22.4" fontFamily={font} fontSize="12" fontWeight="700" letterSpacing="0.4" fill="#A7F3D0">AI</text>
          <text x="48" y="64.8" textAnchor="middle" fontFamily={font} fontSize="48" fontWeight="800" fill="#FFFFFF">RR</text>
        </g>
        <text x="180" y="128" fontFamily={font} fontSize="40" fontWeight="800" letterSpacing="-1" fill="#0B1220">RoadmapResume</text>
        <text x="540" y="260" textAnchor="middle" fontFamily={font} fontSize="44" fontWeight="800" letterSpacing="8" fill="#0B3B2E">ATS SCORE</text>
        <text x="330" y="620" textAnchor="middle" fontFamily={font} fontSize="260" fontWeight="800" fill="#0B1220">{beforeTotal}</text>
        <rect x="275" y="690" width="110" height="110" rx="26" fill={gradeColor(beforeGrade)} />
        <text x="330" y="766" textAnchor="middle" fontFamily={font} fontSize="64" fontWeight="800" fill="#FFFFFF">{beforeGrade}</text>
        <g transform="translate(540,527)"><path d="M-52,-17 L22,-17 L22,-40 L84,0 L22,40 L22,17 L-52,17 Z" fill="#0B6E4F" /></g>
        <text x="750" y="620" textAnchor="middle" fontFamily={font} fontSize="260" fontWeight="800" fill="#0B1220">{afterTotal}</text>
        <rect x="695" y="690" width="110" height="110" rx="26" fill={gradeColor(afterGrade)} />
        <text x="750" y="766" textAnchor="middle" fontFamily={font} fontSize="64" fontWeight="800" fill="#FFFFFF">{afterGrade}</text>
        <text x="540" y="880" textAnchor="middle" fontFamily={font} fontSize="28" fontWeight="500" fill="#64748B">
          {basis ? `Measured in RoadmapResume · scored against ${basis}` : "Measured in RoadmapResume · your score will vary by posting"}
        </text>
        <g transform="translate(260,930)">
          <rect width="560" height="84" rx="42" fill="#0B3B2E" />
          <text x="280" y="55" textAnchor="middle" fontFamily={font} fontSize="33" fontWeight="800" letterSpacing="1" fill="#FFFFFF">
            {delta > 0 ? `+${delta} ATS POINTS` : "MY SCORE JUMP"}
          </text>
        </g>
      </svg>
      <div className="flex gap-2 mt-3">
        <Button variant="emerald" onClick={shareCard} className="flex-1">Share your score jump</Button>
        <Button variant="secondary" onClick={downloadPng} className="flex-1">Download PNG</Button>
      </div>
      {msg && <p className="text-sm text-muted mt-2">{msg}</p>}
    </Card>
  );
}
