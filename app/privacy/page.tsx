import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — HireCraft",
  description: "How HireCraft collects, uses, and protects your data.",
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

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/" className="text-[13px] font-semibold text-emerald-700">
          ‹ Back to HireCraft
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-[13px] text-slate-500">
          Effective: October 11, 2026 · HireCraft ("we", "us")
        </p>

        <S>
          <H>The short version</H>
          <P>
            Your resume is your business. We use what you upload only to provide
            the service you asked for — scoring, rewriting, tailoring, and
            design. <strong>We never train AI models on your data, we never sell
            your data, and you can delete everything at any time.</strong>
          </P>
        </S>

        <S>
          <H>What we collect</H>
          <P><strong>You provide:</strong> resume text or files you upload, job postings you paste or link, career goals and salary targets you enter, quiz answers, your name and email if you create an account, and military-service information if you claim the military trial.</P>
          <P><strong>Automatic:</strong> basic usage analytics (pages visited, features used), device type, and crash reports. No advertising identifiers are collected or shared.</P>
        </S>

        <S>
          <H>How we use it</H>
          <P>
            • To provide the service: your resume text is sent to our AI
            provider solely to generate your score, rewrites, cover letters,
            and recommendations. It is not retained by us for any other purpose
            and is never used to train models.<br />
            • To operate your account, process subscriptions via Apple's
            StoreKit, and enforce the free/paid tiers.<br />
            • To improve the product in aggregate (e.g., "users rewrite bullets
            4x more than cover letters") — never tied to your identity.
          </P>
        </S>

        <S>
          <H>What we never do</H>
          <P>
            • <strong>Never train AI models</strong> on your resumes, cover
            letters, or personal data.<br />
            • <strong>Never sell or rent</strong> your personal data to anyone,
            including recruiters, advertisers, or data brokers.<br />
            • <strong>Never share</strong> your resume content with third
            parties except the AI provider processing your request and the
            verification providers below.
          </P>
        </S>

        <S>
          <H>Military verification (SheerID / ID.me)</H>
          <P>
            If you claim the free military trial, you verify through SheerID or
            ID.me — not through us. Those providers handle your service
            documentation under their own privacy policies. We receive only a
            yes/no verification result and a verification token; we do not see
            or store your military records.
          </P>
        </S>

        <S>
          <H>Job posting links</H>
          <P>
            When you paste a job posting URL, our server fetches the public
            posting text to tailor your resume. We do not log you in anywhere
            and do not access anything behind a login.
          </P>
        </S>

        <S>
          <H>Data retention & deletion</H>
          <P>
            Your resumes and generated content are stored so you can return to
            them. <strong>You can delete your data at any time</strong> from
            Settings → Delete my data, or by emailing{" "}
            <a className="font-semibold text-emerald-700" href="mailto:privacy@hirecraft.app">
              privacy@hirecraft.app
            </a>
            . We honor deletion requests within 30 days. Backups expire within
            90 days.
          </P>
        </S>

        <S>
          <H>Children</H>
          <P>
            HireCraft is not directed at children under 13, and the
            new-to-workforce mode is intended for users 16 and older with
            parental involvement where required by law.
          </P>
        </S>

        <S>
          <H>Security</H>
          <P>
            Data is encrypted in transit (TLS) and at rest. Access is limited to
            the small team operating the service. No system is perfect — if we
            ever have a breach affecting your data, we will tell you promptly.
          </P>
        </S>

        <S>
          <H>Changes</H>
          <P>
            If this policy changes materially, we will note it here and, for
            significant changes, notify you in the app before they take effect.
          </P>
        </S>

        <S>
          <H>Contact</H>
          <P>
            Questions about privacy:{" "}
            <a className="font-semibold text-emerald-700" href="mailto:privacy@hirecraft.app">
              privacy@hirecraft.app
            </a>
          </P>
        </S>

        <div className="mt-10 border-t border-slate-200 pt-6 text-center text-[12px] text-slate-400">
          © 2026 HireCraft. Your data is yours.
        </div>
      </div>
    </main>
  );
}
