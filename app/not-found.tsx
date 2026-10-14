import Link from "next/link";
import { Card } from "@/components/ui";

/**
 * Branded 404 (RR-17) — in the error boundaries' idiom: honest about
 * what happened, reassuring about the user's data, and offering the two
 * useful ways forward. Static and telemetry-free like the rest of the app.
 */
export default function NotFound() {
  return (
    <Card className="text-center mt-10">
      <div className="text-4xl mb-3" aria-hidden="true">🧭</div>
      <h1 className="text-xl font-extrabold text-ink mb-2">That page isn&apos;t on this roadmap</h1>
      <p className="text-[15px] text-muted leading-relaxed mb-5">
        The link may be old or mistyped. Your resume and everything you&apos;ve entered is saved
        on this device — nothing is lost.
      </p>
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/resume"
          className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-xl bg-brand text-white font-bold text-[15px]"
        >
          Back to my resume
        </Link>
        <Link href="/" className="min-h-[44px] flex items-center text-sm font-bold text-pine px-3">
          Go to the start
        </Link>
      </div>
    </Card>
  );
}
