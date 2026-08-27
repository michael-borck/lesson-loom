import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

// Hosted-demo mode ("try in your browser"): when DEMO_BASE_URL and
// DEMO_MODEL are set at build time, the app is locked to that shared
// OpenAI-compatible endpoint and visitors never enter a key. The key comes
// from the DEMO_API_KEY build secret. Desktop/Docker builds set no DEMO_*
// vars, so they stay bring-your-own-key.
const demo =
  process.env.DEMO_BASE_URL && process.env.DEMO_MODEL
    ? {
        label: process.env.DEMO_LABEL || "Shared demo server",
        baseUrl: process.env.DEMO_BASE_URL,
        apiKey: process.env.DEMO_API_KEY || "",
        model: process.env.DEMO_MODEL,
      }
    : null;

// Multi-page build: the landing page lives at the site root, the app at
// /app/. Relative base so the same build works on GitHub Pages
// (/lesson-loom/), the Docker self-host (served at /), and inside the
// Tauri desktop app.
export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DEMO_CONFIG__: JSON.stringify(demo),
  },
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
    },
  },
});
