import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — RoadmapResume",
  description: "How RoadmapResume collects, uses, and protects your data.",
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
        <Link href="/" className="text-[13px] font-semibold text-emerald-700 inline-flex items-center min-h-[44px]">
          ‹ Back to RoadmapResume
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-[13px] text-slate-500">
          Effective: October 13, 2026 · RoadmapResume ("we", "us")
        </p>

        <S>
          <H>The short version</H>
          <P>
            Your resume is your business. RoadmapResume stores it on your device,
            not on our servers. There are no RoadmapResume accounts and no server
            copy of your resume. If you use an AI feature, the relevant text is
            sent to Google Gemini only after you give consent and only to
            generate the result you asked for. <strong>We never sell your data
            and never use it for advertising.</strong>
          </P>
        </S>

        <S>
          <H>What we collect</H>
          <P><strong>Stored only on your device:</strong> resume text (including text extracted from files you upload), job postings you paste or link, LinkedIn text you provide, career goals and salary targets, quiz answers, generated content, job alerts, and — in Veteran mode — your branch, job codes, and performance-review text. This information is kept in the app's local storage on your device.</P>
          <P><strong>Sent only when you use a feature:</strong> after you consent, AI features send the relevant resume, job, LinkedIn, goal, and military text to Google Gemini to generate a response. Job alerts send only your search terms, described below. The app sends us no record of the pages you visit or the features you use, and no advertising identifiers are collected or shared.</P>
        </S>

        <S>
          <H>How we use it</H>
          <P>
            • On-device features: scoring, resume editing, design templates,
            and job matching work with the information stored on your device.<br />
            • AI features: when you run one and have given consent, the
            relevant text passes through our server to Google Gemini solely to
            generate your rewrites, cover letters, LinkedIn content,
            recommendations, or roadmap. We do not store a copy of that text on
            our servers.<br />
            • Job alerts: the role, company, and location terms you enter are
            sent to job-board providers to find matching postings. Your resume
            is not sent for alerts.<br />
            • Subscriptions: Apple handles App Store purchases and payment
            details. RoadmapResume does not receive or store your payment card
            information.
          </P>
        </S>

        <S>
          <H>What we never do</H>
          <P>
            • <strong>Never sell or rent</strong> your personal data to anyone,
            including recruiters, advertisers, or data brokers.<br />
            • <strong>Never use your data for advertising.</strong><br />
            • <strong>Never use your resumes, cover letters, or personal
            information to train AI models.</strong><br />
            • <strong>Never share</strong> your resume content with third
            parties except Google Gemini when you choose to run an AI feature.
            Job-board providers receive only the search terms you enter for an
            alert.
          </P>
        </S>

        <S>
          <H>Military verification (SheerID / ID.me)</H>
          <P>
            The six-month military Pro offer is not enabled in the current
            version of RoadmapResume; it is planned as an update using SheerID or
            ID.me. If that feature launches, those providers — not RoadmapResume —
            will handle verification documents under their own privacy
            policies, and this policy will be updated before the feature is
            enabled. RoadmapResume does not ask for or store copies of military ID
            cards, DD214s, or other verification documents.
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
            Your information remains in local storage on your device until you
            delete it. <strong>You can delete everything at any time</strong>
            from Settings → Delete all my data. That removes your resume,
            military record, alerts, generated content, and consent from the
            device. You can also clear the app's or browser's stored site data
            or delete the app. There is no RoadmapResume server copy for us to
            erase. If you email{" "}
            <a className="font-semibold text-emerald-700" href="mailto:privacy@hirecraft.app">
              privacy@hirecraft.app
            </a>
            , we can explain the deletion steps, but we cannot reach into your
            device and delete its local storage for you.
          </P>
        </S>

        <S>
          <H>Children</H>
          <P>
            RoadmapResume is not directed at children under 13, and the
            new-to-workforce mode is intended for users 16 and older with
            parental involvement where required by law.
          </P>
        </S>

        <S>
          <H>Security</H>
          <P>
            Content you keep in RoadmapResume is held in your device's local
            storage, so protect the device and the browser or app profile you
            use. Information sent for an AI feature or job alert travels over
            encrypted connections (TLS). We do not maintain a server database
            of resumes or generated content. No system is perfect, but keeping
            the data on your device removes a central store of resumes.
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

        <div className="mt-10 border-t border-slate-200 pt-6 text-center text-[12px] text-slate-500">
          © 2026 RoadmapResume. Your data is yours.
        </div>
      </div>
    </main>
  );
}
