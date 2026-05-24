import type { Config } from "tailwindcss";

// Design tokens for the JiraniHub redesign.
//
// Palette spine:
//   - Kenyan flag colors (flag.black/red/green/white) drive accents and the
//     Maasai stripe — they are the cultural through-line, never used as a
//     page background.
//   - JiraniHub identity green (`brand.green` = #0F4D2A) is a deeper
//     estate-forest shade used for headers, primary buttons, hero gradients.
//     Distinct from the canonical Kenya flag green (`flag.green` = #006B3F)
//     so the flag stripe still reads as a flag rather than a tonal smear.
//   - Gold (`brand.gold` = #D4A017) is the warm accent on dark surfaces —
//     matches the KASH and Diagnostic references.
//   - Cream (`tribal.cream` = #F7F2E5) replaces pure white as the page bg.
//     Easier on the eye in Kenyan daylight on budget Android.

const config: Config = {
  darkMode: ["class"],
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        flag: {
          black: "#0A0A0A",
          red: "#BB0000",
          green: "#006B3F",
          white: "#FFFFFF",
        },
        brand: {
          green: "#0F4D2A",
          "green-mid": "#1B5E20",
          "green-dark": "#063519",
          "green-soft": "rgba(15, 77, 42, 0.08)",
          gold: "#D4A017",
          "gold-light": "#F0C040",
          "gold-dark": "#9A6E00",
          "gold-soft": "rgba(212, 160, 23, 0.14)",
          amber: "#D47A00",
          red: "#BB0000",
          "red-soft": "rgba(187, 0, 0, 0.08)",
        },
        tribal: {
          cream: "#F7F2E5",
          "cream-dark": "#EFE7D2",
          sand: "#EDE3C8",
          border: "#D7CBA5",
          "border-soft": "#E4DCC3",
          earth: "#6B5D45",
          "earth-dark": "#4A4030",
          charcoal: "#1A1A1A",
          muted: "#8A8170",
        },
        background: "#F7F2E5",
        surface: "#FFFFFF",
        border: "#D7CBA5",
      },
      fontFamily: {
        // DM Sans = UI workhorse (matches KASH). Plus Jakarta = display
        // weight on heroes. Cormorant Garamond = warm italic accent
        // (matches Diagnostic).
        sans: ['"DM Sans"', "Inter", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', '"DM Sans"', "sans-serif"],
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
      },
      borderRadius: {
        lg: "0.875rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
      boxShadow: {
        card: "0 1px 3px rgba(15, 77, 42, 0.06), 0 1px 2px rgba(15, 77, 42, 0.04)",
        "card-lg": "0 10px 30px -12px rgba(15, 77, 42, 0.18)",
        hero: "0 20px 60px -15px rgba(6, 53, 25, 0.45)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-up": "fadeUp 0.35s ease-out",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
