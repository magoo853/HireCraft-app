"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";

/**
 * Route-level error boundary. Catches render/runtime errors in any page
 * below the root layout (the TopBar/BottomNav chrome stays in place).
 * Deliberately reports nothing anywhere — ResumeRoadmap has no telemetry or
 * crash reporting (see the privacy policy); recovery is entirely local.
 */
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="text-center mt-10">
      <div className="text-4xl mb-3" aria-hidden="true">🛠️</div>
      <h1 className="text-xl font-extrabold text-ink mb-2">Something went wrong on our end</h1>
      <p className="text-[15px] text-muted leading-relaxed mb-5">
        Your resume and everything you&apos;ve entered is saved on this device — nothing is lost.
        Try again, and if it keeps happening, closing and reopening the app usually clears it.
      </p>
      <div className="flex flex-col items-center gap-2">
        <Button variant="emerald" onClick={() => reset()}>Try again</Button>
        <Link href="/resume" className="min-h-[44px] flex items-center text-sm font-bold text-pine px-3">
          Back to my resume
        </Link>
      </div>
    </Card>
  );
}
