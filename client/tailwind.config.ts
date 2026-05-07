import type { Config } from "tailwindcss";
import path from "path";

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
          green: "#1A5C38",
          "green-light": "#2A7A4E",
          "green-dark": "#0F3C24",
          amber: "#D47A00",
          "amber-light": "#F09010",
          "amber-dark": "#A05800",
        },
        kenya: {
          red: "#BB0000",
          green: "#006600",
          black: "#000000",
        },
        background: "#FFFFFF",
        surface: "#F8F7F5",
        border: "#E8E6E3",
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
