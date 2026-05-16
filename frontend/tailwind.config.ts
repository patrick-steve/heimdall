import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d10",
        slab: "#11151b",
        edge: "#1c232c",
        edgeHi: "#2a3340",
        rune: "#7c3aed",
        bifrost: "#a78bfa",
        glacier: "#c4b5fd",
        allow: "#10b981",
        warn: "#f59e0b",
        deny: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // 1.25 ratio scale
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.55" }],
        base: ["15px", { lineHeight: "1.6" }],
        lg: ["19px", { lineHeight: "1.5" }],
        xl: ["24px", { lineHeight: "1.35" }],
        "2xl": ["30px", { lineHeight: "1.25" }],
        "3xl": ["38px", { lineHeight: "1.15" }],
        "4xl": ["48px", { lineHeight: "1.05" }],
        "5xl": ["60px", { lineHeight: "1" }],
        "6xl": ["76px", { lineHeight: "0.96" }],
        "7xl": ["96px", { lineHeight: "0.95" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight: "-0.015em",
        normal: "0",
        wide: "0.025em",
        wider: "0.08em",
        widest: "0.16em",
      },
      maxWidth: {
        prose: "65ch",
        page: "1200px",
        page_wide: "1320px",
      },
      animation: {
        pulse_soft: "pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shatter: "shatter 0.6s ease-out forwards",
        rise: "rise 720ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        sweep: "sweep 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        shatter: {
          "0%":   { transform: "translateY(0) rotate(0)", opacity: "1" },
          "50%":  { transform: "translateY(-2px) rotate(-3deg)", opacity: ".8" },
          "100%": { transform: "translateY(8px) rotate(6deg)", opacity: "0" },
        },
        rise: {
          "0%":   { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        sweep: {
          "0%, 100%": { opacity: "0.3" },
          "50%":      { opacity: "0.9" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
