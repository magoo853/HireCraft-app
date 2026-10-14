import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hirecraft.app",
  appName: "ResumeRoadmap",
  webDir: "www",
  // v1 native shell loads the hosted production build. This keeps the
  // Next.js API routes (AI, job fetch, verification) working without a
  // static-export refactor. Set the URL after the first Vercel deploy.
  server: {
    url: "https://hirecraft-app-steel.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    // Capacitor auto-generates the Xcode project on `npx cap add ios`
    // (run on a Mac; the project is committed under ios/ afterwards).
  },
  // No plugins block: the splash screen is the native LaunchScreen
  // storyboard/imageset (installed by ios-assets/install-assets.sh).
  // A former plugins.SplashScreen block was removed (RR-18) — no
  // @capacitor/splash-screen package is installed, so it configured
  // nothing and only misled future readers.
};

export default config;
