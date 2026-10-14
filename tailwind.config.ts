/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0B1220",
        pine: "#0B3B2E",
        brand: "#10B981",
        cta: "#047857",
        mint: "#ECFDF5",
        paper: "#F8FAFC",
        ink: "#0B1220",
        line: "#E2E8F0",
        muted: "#64748B",
        linkedin: "#0A66C2",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
