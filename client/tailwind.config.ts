import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./client/src/**/*.{ts,tsx}",
    "./client/index.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#1B5E20",
          "green-light": "#2E7D32",
          "green-dark": "#0D3B11",
          amber: "#D47A00",
          "amber-light": "#F09010",
          "amber-dark": "#A05800",
          gold: "#D4A017",
          "gold-light": "#F0C040",
          red: "#B71C1C",
          "red-light": "#EF5350",
        },
        tribal: {
          cream: "#F5F1E8",
          sand: "#EDE7D8",
          border: "#D4C9A8",
          earth: "#6B5D45",
          charcoal: "#212121",
          ochre: "#C8960C",
          red: "#B71C1C",
        },
        background: "#F5F1E8",
        surface: "#EDE7D8",
        border: "#D4C9A8",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Inter", "sans-serif"],
        display: ["IBM Plex Sans", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
