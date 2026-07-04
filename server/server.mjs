/**
 * Lesson Loom self-host server.
 *
 * Serves the static SPA build and proxies AI API calls, injecting API keys
 * from environment variables so keys never reach the browser.
 *
 * Environment variables (see .env.example):
 *   PORT                     default 8080
 *   APP_PASSWORD             optional shared access password for /api/*
 *   ANTHROPIC_API_KEY        enables the Anthropic provider
 *   ANTHROPIC_MODELS         comma-separated model choices shown in the UI
 *   OPENAI_COMPAT_BASE_URL   enables an OpenAI-compatible provider
 *                            (include the /v1 path, e.g. https://openrouter.ai/api/v1
 *                            or http://ollama:11434/v1)
 *   OPENAI_COMPAT_API_KEY    optional bearer key for that endpoint
 *   OPENAI_COMPAT_MODELS     comma-separated model choices shown in the UI
 *   OPENAI_COMPAT_LABEL      display name in the UI (default "Server model")
 *
 * No dependencies — plain Node 20+.
 */
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const PORT = Number(process.env.PORT || 8080);
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const APP_PASSWORD = process.env.APP_PASSWORD || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODELS = (
  process.env.ANTHROPIC_MODELS || "claude-opus-4-8,claude-sonnet-5,claude-haiku-4-5"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OPENAI_BASE = (process.env.OPENAI_COMPAT_BASE_URL || "").replace(/\/+$/, "");
const OPENAI_KEY = process.env.OPENAI_COMPAT_API_KEY || "";
const OPENAI_MODELS = (process.env.OPENAI_COMPAT_MODELS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OPENAI_LABEL = process.env.OPENAI_COMPAT_LABEL || "Server model";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".md": "text/markdown; charset=utf-8",
};

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(data);
}

function unauthorized(res) {
  json(res, 401, { error: "Missing or wrong access password." });
}

async function proxy(req, res, upstreamUrl, headers) {
  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
      duplex: "half",
    });
    const outHeaders = {};
    for (const name of ["content-type", "cache-control"]) {
      const v = upstream.headers.get(name);
      if (v) outHeaders[name] = v;
    }
    res.writeHead(upstream.status, outHeaders);
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    json(res, 502, { error: `Upstream request failed: ${err.message}` });
  }
}

function serveStatic(req, res, urlPath) {
  let filePath = path.normalize(path.join(DIST, urlPath));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const index = path.join(filePath, "index.html");
    filePath = existsSync(index) ? index : path.join(DIST, "index.html");
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": urlPath.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  if (p === "/api/config") {
    json(res, 200, {
      managed: true,
      requiresPassword: Boolean(APP_PASSWORD),
      anthropic: ANTHROPIC_API_KEY ? { models: ANTHROPIC_MODELS } : null,
      openaiCompat: OPENAI_BASE
        ? { label: OPENAI_LABEL, models: OPENAI_MODELS }
        : null,
    });
    return;
  }

  if (p.startsWith("/api/")) {
    if (APP_PASSWORD && req.headers["x-app-password"] !== APP_PASSWORD) {
      unauthorized(res);
      return;
    }

    if (p.startsWith("/api/anthropic/")) {
      if (!ANTHROPIC_API_KEY) {
        json(res, 503, { error: "Anthropic is not configured on this server." });
        return;
      }
      const rest = p.slice("/api/anthropic".length); // e.g. /v1/messages
      await proxy(req, res, `https://api.anthropic.com${rest}${url.search}`, {
        "content-type": req.headers["content-type"] || "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": req.headers["anthropic-version"] || "2023-06-01",
        ...(req.headers["anthropic-beta"]
          ? { "anthropic-beta": req.headers["anthropic-beta"] }
          : {}),
      });
      return;
    }

    if (p.startsWith("/api/openai/v1/")) {
      if (!OPENAI_BASE) {
        json(res, 503, {
          error: "No OpenAI-compatible endpoint is configured on this server.",
        });
        return;
      }
      const rest = p.slice("/api/openai/v1".length); // e.g. /chat/completions
      await proxy(req, res, `${OPENAI_BASE}${rest}${url.search}`, {
        "content-type": req.headers["content-type"] || "application/json",
        ...(OPENAI_KEY ? { authorization: `Bearer ${OPENAI_KEY}` } : {}),
      });
      return;
    }

    json(res, 404, { error: "Unknown API route." });
    return;
  }

  serveStatic(req, res, p);
});

server.listen(PORT, () => {
  console.log(`Lesson Loom listening on http://0.0.0.0:${PORT}`);
  console.log(`  Anthropic provider:         ${ANTHROPIC_API_KEY ? "enabled" : "disabled"}`);
  console.log(`  OpenAI-compatible provider: ${OPENAI_BASE || "disabled"}`);
  console.log(`  Access password:            ${APP_PASSWORD ? "required" : "not set (open access!)"}`);
});
