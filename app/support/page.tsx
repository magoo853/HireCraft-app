import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What does the AI see?",
    a: "Only what you send it, and only with your consent. When you run an AI feature (rewrites, cover letters, LinkedIn, roadmaps, matching), your resume text goes to our AI provider to generate the result. If you've added a performance review, its text is sent too — in any mode. In Veteran mode, your job codes are sent as well. Scoring, design templates, and job alerts never send your resume anywhere — alerts send only your search terms (role, company, location) to public job boards.",
  },
  {
    q: "Where is my resume stored?",
    a: "On your device, in the app's local storage. There are no ResumeRoadmap accounts and no server copy of your resume. Deleting the app's data (Settings → Delete all my data) wipes it completely.",
  },
  {
    q: "How does the free trial and Pro work?",
    a: "The ATS score + breakdown, the ATS simulator, keyword match preview, the resume builder, and all 9 design templates are free. ResumeRoadmap Pro ($25/year) unlocks unlimited rewrites, job tailoring, the cover letter generator, the LinkedIn builder, career roadmaps, job alerts, and PDF & DOCX export. New users get a two-week free trial of Pro. Veterans and service members get six months of Pro free once military verification (SheerID / ID.me) is enabled in the app — it's rolling out as an update. The two-week trial is a launch offer: it activates at launch, during the launch window.",
  },
  {
    q: "I bought Pro — how do I restore it?",
    a: "In this web build everything is unlocked and there are no purchases, so there's nothing to restore. Purchases and Restore Purchases arrive with the iOS subscription build — there, your subscription is tied to your Apple ID and comes back on any device signed into the same account. Questions in the meantime? Contact us below and we'll sort it out.",
  },
  {
    q: "Do job alerts run while the app is closed?",
    a: "Not yet — alerts are checked when you open Discover or tap \"Check for new jobs,\" and new matches are badged on the Discover tab. Background push alerts need user accounts and a notification service; they're planned, and we'll say so plainly here when they land.",
  },
  {
    q: "The app translated my military job wrong. What now?",
    a: "Tell us. The built-in crosswalk covers the most common MOS / rating / AFSC codes; anything else is translated by the AI. If either gets your job wrong, email us your code and what it should say — crosswalk fixes ship fast.",
  },
  {
    q: "How do I delete everything?",
    a: "Settings (gear icon) → Delete all my data. That removes your resume, military record, alerts, and consent from the device immediately. There's nothing stored server-side to delete.",
  },
];

export default function SupportPage() {
  return (
    <div>
      <SectionTitle sub="Help, honest answers, and a human to email.">Support</SectionTitle>

      <Card className="mb-4">
        <p className="font-bold text-ink text-sm mb-1">Contact us</p>
        <p className="text-sm text-muted leading-relaxed">
          Email <a href="mailto:privacy@hirecraft.app" className="font-bold text-emerald-700 underline">privacy@hirecraft.app</a> —
          a person reads it. Include your device model and what you tapped, and we'll get back to you.
        </p>
        <p className="text-xs text-muted mt-2">
          Privacy questions go to the same address. Full policy: <Link href="/privacy" className="underline font-semibold">Privacy Policy</Link>.
        </p>
      </Card>

      <div className="grid gap-3">
        {FAQS.map((f) => (
          <Card key={f.q}>
            <p className="font-bold text-ink text-sm mb-1">{f.q}</p>
            <p className="text-[13px] text-muted leading-relaxed">{f.a}</p>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-muted mt-6">ResumeRoadmap — built for the transition.</p>
    </div>
  );
}
