# 🧵 Lesson Loom

**AI-assisted lesson plan generator.** Upload a piece of teaching material (a lecture, worksheet, reading, or outline), choose your audience and a pedagogical framework, and generate a structured, timed lesson plan you can refine in conversation and collect into a course dashboard.

- **Landing page:** https://lessonloom.borck.education/
- **Web app:** https://lessonloom.borck.education/app/
- **Desktop downloads:** https://github.com/michael-borck/lesson-loom/releases/latest

## Four ways to run it

| | Keys? | Best for |
|---|---|---|
| **Try in your browser** (GitHub Pages) | No key needed — runs on a shared Ollama server (gemma4, thinking off) | Trying it out instantly |
| **Standalone HTML** (single file from [Releases](https://github.com/michael-borck/lesson-loom/releases/latest)) | Your browser's local storage — bring your own provider/key | Offline use, emailing to a colleague, locked-down machines — just double-click the file |
| **Desktop app** (Tauri: Mac/Windows/Linux) | On your machine — bring your own provider/key | Educators worried about material passing through a web page |
| **Self-hosted** (Docker) | A `.env` on your server — never in any browser | Departments/institutions with one shared org key |

There is no Lesson Loom backend collecting anything. In the bring-your-own-key versions, teaching material goes only to the AI provider you choose; in the browser demo it goes to the shared Ollama server shown above.

The standalone HTML (`lesson-loom-standalone.html`) is the whole app inlined into one file — open it straight from disk, no server or install. It includes a **Check for updates** button (footer / Settings) that tells you when a newer release is out and links to the download; it never auto-updates. Note: from `file://`, PDF text extraction runs on the main thread (browsers block module workers there) — fine for typical teaching documents.

## AI providers

The **browser demo** is locked to a shared Ollama server at build time (no key entry). The **standalone HTML, desktop, and self-hosted** builds are bring-your-own-provider: Anthropic (Claude, default — reads PDFs natively including figures), OpenAI, OpenRouter, Ollama (local or remote — set the base URL; an optional API key is sent as a Bearer token for auth-proxied/remote instances, and local Ollama is fully offline), or any custom OpenAI-compatible endpoint. Non-Anthropic providers receive PDF text extracted in the browser; scanned/image PDFs need Anthropic.

To configure the demo on your own Pages/static build, set these env vars when running `npm run build` (they're baked into the bundle — see `deploy.yml`):

```
DEMO_BASE_URL=https://ollama.example.com/v1   # required, enables demo mode
DEMO_MODEL=gemma4:12b                          # required
DEMO_API_KEY=...                               # bearer key, if the endpoint needs one
DEMO_LABEL="Shared Ollama server"              # shown in the footer/Settings
```

Note: a key embedded this way is extractable from the public JS — that's unavoidable on static hosting. Treat it as a casual-abuse deterrent: rate-limit at the proxy in front of Ollama and rotate the key if it's abused. For real protection, put a small serverless proxy (e.g. a Cloudflare Worker) in front instead.

## Features (MVP / Phase 1)

- Upload PDF / DOCX / Markdown / text, or paste material
- Context settings: sector, duration, class size, delivery mode, learner profile, GenAI policy, plus optional sequence context (previously covered / coming next / prior knowledge / assessment)
- Three frameworks with "when to use" guidance: Gagné's Nine Events, BOPPPS, 5E
- Generated plans: Bloom-tagged objectives, timed segments summing to the session length, formative checks with anticipated misconceptions, differentiation/UDL notes, a student-facing GenAI use statement, materials checklist, homework bridge, and surfaced assumptions
- Conversational refinement ("cut this to 40 minutes") — the plan updates in place
- Course-grouped dashboard (browser storage) and Markdown export

See [`lesson-plan-generator-concept.md`](./lesson-plan-generator-concept.md) for the full concept and roadmap.

## Self-hosting with Docker

```sh
git clone https://github.com/michael-borck/lesson-loom
cd lesson-loom
cp .env.example .env   # add your API key(s); set APP_PASSWORD!
docker compose up -d   # serves on :8080
```

The container serves the same app in **managed mode**: educators pick a provider/model but never see or enter API keys — the server proxies AI calls and injects keys from the `.env`. Configure Anthropic, an OpenAI-compatible endpoint (OpenAI/OpenRouter/an Ollama container), or both. **Set `APP_PASSWORD`** unless the server is otherwise access-controlled — an open proxy lets anyone spend your API credits. Put it behind your usual reverse proxy for TLS.

## Development

```sh
npm install
npm run dev            # web: landing at /, app at /app/
npm run build          # type-check + build to dist/
npm run build:standalone  # single-file app → dist-standalone/lesson-loom-standalone.html
node server/server.mjs # run the self-host server against dist/
npx tauri dev          # desktop app (requires Rust)
```

Repo layout: `index.html` + `landing/` (landing page) · `app/` + `src/` (the React app) · `server/` (self-host proxy) · `src-tauri/` (desktop wrapper) · `scripts/capture.mjs` (regenerates landing screenshots + app icon via headless Chrome).

## Releasing

- **Web + landing**: every push to `main` deploys to GitHub Pages.
- **Desktop**: push a tag like `v0.2.0` — GitHub Actions builds macOS (Apple Silicon + Intel), Windows, and Linux installers and publishes a GitHub Release. The landing page picks up the latest release automatically.
- **Standalone HTML**: the same tag build also attaches `lesson-loom-standalone.html` to the release (single file; the in-app update check compares against the latest release tag).
- macOS builds are code signed and notarized (via the `APPLE_*` secrets used in `.github/workflows/release.yml`), so they open normally on first launch.
- Docker images are built from source on your server (`docker compose up -d --build` after `git pull`).
