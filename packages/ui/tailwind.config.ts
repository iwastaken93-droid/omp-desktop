import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#fafaf9",
        surface: "#ffffff",
        ink: {
          DEFAULT: "#1c1917",
          soft: "#57534e",
          faint: "#a8a29e",
        },
        line: {
          DEFAULT: "#e7e5e4",
          strong: "#d6d3d1",
        },
        omp: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        dusk: {
          // warm neutral for secondary surfaces
          50: "#faf9f7",
          100: "#f5f4f1",
          200: "#eae8e3",
        },
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono Variable", "JetBrains Mono", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 3px rgba(28, 25, 23, 0.06)",
        pop: "0 8px 30px rgba(28, 25, 23, 0.12), 0 2px 8px rgba(28, 25, 23, 0.06)",
        glow: "0 0 0 1px rgba(34, 197, 94, 0.25), 0 8px 30px rgba(34, 197, 94, 0.18)",
      },
      keyframes: {
        "rainbow-slide": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "rainbow-slide": "rainbow-slide 6s linear infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "fade-up": "fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
