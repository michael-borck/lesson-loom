import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Multi-page build: the landing page lives at the site root, the app at
// /app/. Relative base so the same build works on GitHub Pages
// (/lesson-loom/), the Docker self-host (served at /), and inside the
// Tauri desktop app.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
    },
  },
});
