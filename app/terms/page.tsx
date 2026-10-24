import Link from "next/link";

export const metadata = {
  title: "Terms of Use — ResumeRoadmap",
  description: "The terms that govern your use of ResumeRoadmap, including ResumeRoadmap Pro subscriptions.",
};

const S = ({ children }: { children: React.ReactNode }) => (
  <section className="mt-8">{children}</section>
);
const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{children}</p>
);

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/" className="text-[13px] font-semibold text-emerald-700 inline-flex items-center min-h-[44px]">
          ‹ Back to ResumeRoadmap
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
          Terms of Use
        </h1>
        <p className="mt-2 text-[13px] text-slate-500">
          Effective: October 24, 2026 · ResumeRoadmap ("we", "us")
        </p>

        <S>
          <H>The short version</H>
          <P>
            ResumeRoadmap is a resume-building tool that runs on your device.
            There is no ResumeRoadmap account. Your use of the app is governed
            by these terms and by Apple's standard Terms of Use (EULA), linked
            below. ResumeRoadmap Pro is an optional auto-renewable subscription
            billed by Apple. How your data is handled is covered by the{" "}
            <Link href="/privacy" className="font-semibold text-emerald-700 underline">
              Privacy Policy
            </Link>
            .
          </P>
        </S>

        <S>
          <H>Apple's Terms of Use (EULA)</H>
          <P>
            The iOS app is licensed to you under Apple's standard Licensed
            Application End User License Agreement:{" "}
            <a
              className="font-semibold text-emerald-700 underline"
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple's standard Terms of Use (EULA)
            </a>
            . These terms add to that agreement; if the two ever conflict for
            your use of the iOS app, Apple's EULA controls.
          </P>
        </S>

        <S>
          <H>ResumeRoadmap Pro subscription</H>
          <P>
            <strong>What it is:</strong> Pro is an auto-renewable yearly
            subscription ("ResumeRoadmap Pro Yearly"). The price is the one
            shown in the App Store and on the purchase screen when you
            subscribe — currently US$24.99 per year. Apple charges your Apple
            ID at purchase.
          </P>
          <P>
            <strong>Free trial:</strong> where a free trial is offered, Pro
            begins with a 2-week free trial. If you don't cancel before the
            trial ends, it converts to the paid yearly subscription and your
            Apple ID is charged the yearly price.
          </P>
          <P>
            <strong>Renewal:</strong> the subscription renews automatically
            for another year unless auto-renew is turned off at least 24 hours
            before the end of the current period. Your account is charged for
            renewal within the 24 hours before the current period ends.
          </P>
          <P>
            <strong>Managing or cancelling:</strong> you can manage or cancel
            any time in your Apple ID subscription settings (on your device:
            Settings → your name → Subscriptions). Cancelling stops the next
            renewal; Pro stays active until the end of the period already paid
            for. Deleting the app does not cancel the subscription.
          </P>
          <P>
            <strong>Restoring a purchase:</strong> if you have already
            subscribed, Restore Purchases — on the Premium screen in the app —
            reactivates Pro on any device signed in to the same Apple ID.
          </P>
          <P>
            Apple processes subscription payments. ResumeRoadmap does not
            receive or store your payment card information.
          </P>
        </S>

        <S>
          <H>Free and Pro</H>
          <P>
            The basics are free: the ATS score and breakdown, the ATS
            simulator, keyword match preview, the resume builder with file
            upload, and all 9 design templates. Pro unlocks unlimited bullet
            rewrites, job-posting tailoring, the cover letter generator, the
            LinkedIn builder, career roadmaps, job alerts, and PDF &amp; DOCX
            export.
          </P>
        </S>

        <S>
          <H>Using ResumeRoadmap</H>
          <P>
            No account is required, and the app stores your work on your
            device (see the Privacy Policy). Use the app for your own career
            materials, and only with content you have the right to use.
          </P>
          <P>
            ResumeRoadmap is a tool, not a guarantee. The AI features produce
            drafts — rewrites, cover letters, LinkedIn content, and roadmaps —
            for you to review. <strong>You are responsible for checking
            generated content for accuracy before you use it</strong>, and for
            the content you provide to the app. ResumeRoadmap does not promise
            interviews, job offers, or salary outcomes.
          </P>
        </S>

        <S>
          <H>Changes</H>
          <P>
            If these terms change materially, we will note it here and update
            the effective date and, for significant changes, notify you in the
            app before they take effect.
          </P>
        </S>

        <S>
          <H>Contact</H>
          <P>
            Questions about these terms:{" "}
            <a className="font-semibold text-emerald-700" href="mailto:privacy@hirecraft.app">
              privacy@hirecraft.app
            </a>
          </P>
        </S>

        <div className="mt-10 border-t border-slate-200 pt-6 text-center text-[12px] text-slate-500">
          © 2026 ResumeRoadmap.
        </div>
      </div>
    </main>
  );
}
