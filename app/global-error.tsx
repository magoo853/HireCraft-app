"use client";

/**
 * Global error boundary — the last resort, rendered when the root layout
 * itself fails. It replaces the layout, so it must render its own
 * <html>/<body> and cannot rely on globals.css or Tailwind having loaded;
 * all styling is inline and self-contained. Like app/error.tsx it reports
 * nothing anywhere: HireCraft has no telemetry or crash reporting (see the
 * privacy policy); recovery is entirely local.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#F8FAFC",
          color: "#0B1220",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main
          style={{
            maxWidth: "32rem",
            margin: "0 auto",
            padding: "4rem 1rem 2rem",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              padding: "24px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "12px" }} aria-hidden="true">🛠️</div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 8px" }}>
              Something went wrong on our end
            </h1>
            <p style={{ fontSize: "15px", color: "#64748B", lineHeight: 1.6, margin: "0 0 20px" }}>
              Your resume and everything you&apos;ve entered is saved on this device — nothing is lost.
              Try again, and if it keeps happening, closing and reopening the app usually clears it.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "0 20px",
                border: "none",
                borderRadius: "14px",
                background: "#10B981",
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
