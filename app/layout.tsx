import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { BottomNav, TopBar } from "@/components/ui";
import { AiConsentGate } from "@/components/consent";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HireCraft — AI Resume & LinkedIn Optimizer",
  description: "Beat the ATS. Score your resume, rewrite bullets, tailor to any job posting, and polish your LinkedIn.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F8FAFC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <TopBar
            title="HireCraft"
            right={
              <>
                <Link href="/resume" className="min-h-[44px] flex items-center text-sm font-bold text-pine px-2.5">
                  Resume
                </Link>
                <Link href="/paywall" className="min-h-[44px] flex items-center text-sm font-bold text-emerald-700 px-2.5">
                  Premium
                </Link>
                <Link href="/settings" aria-label="Settings" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xl text-muted">
                  ⚙
                </Link>
              </>
            }
          />
          <main className="max-w-lg mx-auto px-4 pt-5 pb-28">{children}</main>
          <BottomNav />
          <AiConsentGate />
        </AppProvider>
      </body>
    </html>
  );
}
