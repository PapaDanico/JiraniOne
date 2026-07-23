import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";
import { BRAND_NAME, BRAND_TAGLINE, PRIMARY_URL } from "../shared/brand";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// index.html is static and can't import TS, so brand strings there are
// %PLACEHOLDER% tokens stamped in at build/dev time from shared/brand.ts —
// keeping the rebrand a one-file change even for HTML meta/OG tags.
function brandHtml(): Plugin {
  const tokens: Record<string, string> = {
    "%BRAND_NAME%": BRAND_NAME,
    "%BRAND_TAGLINE%": BRAND_TAGLINE,
    "%PRIMARY_URL%": PRIMARY_URL,
  };
  return {
    name: "brand-html",
    transformIndexHtml(html) {
      return Object.entries(tokens).reduce(
        (out, [token, value]) => out.replaceAll(token, value),
        html,
      );
    },
  };
}

export default defineConfig({
  plugins: [
    brandHtml(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-32.png", "icons/favicon-16.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: BRAND_NAME,
        short_name: BRAND_NAME,
        description: BRAND_TAGLINE,
        start_url: "/",
        display: "standalone",
        background_color: "#F5F0E8",
        theme_color: "#1A5C38",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // API responses are session-sensitive and already cached client-side
        // via React Query — the service worker only precaches the built app
        // shell (JS/CSS/HTML) plus runtime-caches static image assets, never
        // /api/* or /uploads/*.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        // Web Push handlers live in a separate plain-JS file pulled into
        // the generated SW — keeps generateSW (precache config stays
        // declarative) while still handling push/notificationclick.
        importScripts: ["push-sw.js"],
        runtimeCaching: [
          {
            urlPattern: /\/(brand|icons)\/.*\.(png|webp|svg)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "jiranihub-images",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  root: __dirname,
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          query: ["@tanstack/react-query"],
          forms: ["react-hook-form", "zod"],
          utils: ["lucide-react", "date-fns", "clsx", "tailwind-merge"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
