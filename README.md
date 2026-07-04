# 🧵 Lesson Loom

**AI-assisted lesson plan generator.** Upload a piece of teaching material (a lecture, worksheet, reading, or outline), choose your audience and a pedagogical framework, and generate a structured, timed lesson plan you can refine in conversation and collect into a course dashboard.

- **Landing page:** https://michael-borck.github.io/lesson-loom/
- **Web app:** https://michael-borck.github.io/lesson-loom/app/
- **Desktop downloads:** https://github.com/michael-borck/lesson-loom/releases/latest

## Three ways to run it

| | Where keys live | Best for |
|---|---|---|
| **Web app** (GitHub Pages) | Your browser's local storage | Trying it out; individual educators |
| **Desktop app** (Tauri: Mac/Windows/Linux) | On your machine | Educators worried about material passing through a web page |
| **Self-hosted** (Docker) | A `.env` on your server — never in any browser | Departments/institutions with one shared org key |

In all three, teaching material goes only to the AI provider you choose — there is no Lesson Loom backend collecting anything.

## AI providers

Anthropic (Claude, default — reads PDFs natively including figures), OpenAI, OpenRouter, Ollama (local — fully offline material handling), or any custom OpenAI-compatible endpoint. Non-Anthropic providers receive PDF text extracted in the browser; scanned/image PDFs need Anthropic.

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
node server/server.mjs # run the self-host server against dist/
npx tauri dev          # desktop app (requires Rust)
```

Repo layout: `index.html` + `landing/` (landing page) · `app/` + `src/` (the React app) · `server/` (self-host proxy) · `src-tauri/` (desktop wrapper) · `scripts/capture.mjs` (regenerates landing screenshots + app icon via headless Chrome).

## Releasing

- **Web + landing**: every push to `main` deploys to GitHub Pages.
- **Desktop**: push a tag like `v0.2.0` — GitHub Actions builds macOS (Apple Silicon + Intel), Windows, and Linux installers and publishes a GitHub Release. The landing page picks up the latest release automatically.
- macOS builds are unsigned for now (right-click → Open on first launch). Notarization can be added later via the `APPLE_*` secrets noted in `.github/workflows/release.yml`.
- Docker images are built from source on your server (`docker compose up -d --build` after `git pull`).
