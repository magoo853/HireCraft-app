import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hirecraft.app",
  appName: "HireCraft",
  webDir: "www",
  // v1 native shell loads the hosted production build. This keeps the
  // Next.js API routes (AI, job fetch, verification) working without a
  // static-export refactor. Set the URL after the first Vercel deploy.
  server: {
    url: "https://hirecraft-app.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    // Capacitor auto-generates the Xcode project on `npx cap add ios`
    // (run on a Mac; the project is committed under ios/ afterwards).
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0B3B2E",
      showSpinner: false,
    },
  },
};

export default config;
