import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

/**
 * Standalone build: the whole app (JS, CSS, and the pdf.js worker as a data
 * URI) inlined into a single self-contained HTML file that works when opened
 * straight from disk (file://) — no server, no install.
 *
 * Output: dist-standalone/lesson-loom-standalone.html
 */

const OUT_NAME = "lesson-loom-standalone.html";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Inline the built JS/CSS into the HTML and drop the separate asset files. */
function singleFile(): Plugin {
  return {
    name: "lesson-loom:single-file",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const htmlKey = Object.keys(bundle).find((k) => k.endsWith(".html"));
      if (!htmlKey) throw new Error("single-file: no HTML entry in bundle");
      const html = bundle[htmlKey];
      if (html.type !== "asset" || typeof html.source !== "string") {
        throw new Error("single-file: unexpected HTML bundle entry");
      }

      let out = html.source;
      const inline = (key: string, replacement: string): void => {
        // Reference may be relative ("./assets/x.js" or "../assets/x.js").
        const tag = new RegExp(
          `<(?:script|link)\\b[^>]*(?:src|href)=["'][^"']*${escapeRegExp(key)}["'][^>]*>(?:\\s*</script>)?`,
        );
        if (!tag.test(out)) {
          throw new Error(`single-file: ${key} is not referenced in the HTML`);
        }
        out = out.replace(tag, () => replacement);
        delete bundle[key];
      };

      for (const [key, item] of Object.entries(bundle)) {
        if (key === htmlKey) continue;
        if (item.type === "chunk") {
          // "</script>" inside a JS string literal would end the inline script
          // early; "<\/script>" is equivalent inside JS strings.
          const code = item.code.replace(/<\/script/gi, "<\\/script");
          inline(key, `<script type="module">\n${code}\n</script>`);
        } else if (item.type === "asset" && key.endsWith(".css")) {
          inline(key, `<style>\n${item.source}\n</style>`);
        }
      }

      // Fail loudly if anything external is still referenced (favicon is a
      // data: URI and fine).
      const leftover = [...out.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/g)]
        .map((m) => m[1])
        .filter((u) => !u.startsWith("data:"));
      if (leftover.length) {
        throw new Error(`single-file: un-inlined references remain: ${leftover.join(", ")}`);
      }

      html.source = out;
      html.fileName = OUT_NAME;
    },
  };
}

export default defineConfig({
  plugins: [react(), singleFile()],
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // The standalone build is always bring-your-own-key.
    __DEMO_CONFIG__: "null",
  },
  build: {
    outDir: "dist-standalone",
    // Inline every asset (notably the pdf.js worker) as a data URI.
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: resolve(__dirname, "app/index.html"),
      output: {
        // One entry chunk — merge Vite's browser-compat shim chunks too.
        inlineDynamicImports: true,
      },
    },
  },
});
