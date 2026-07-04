# 🧵 Lesson Loom

**AI-assisted lesson plan generator.** Upload a piece of teaching material (a lecture, worksheet, reading, or outline), choose your audience and a pedagogical framework, and generate a structured, timed lesson plan you can refine in conversation and collect into a course dashboard.

**Live app:** https://michael-borck.github.io/lesson-loom/

## How it works

Lesson Loom is a fully static single-page app — there is **no backend**. You supply your own Anthropic API key in Settings; it is stored only in your browser's local storage, and the app calls the Anthropic API directly from the browser. Your teaching material and generated plans never touch any server other than Anthropic's API. This makes it free to host and privacy-friendly by design.

### Current features (MVP / Phase 1)

- **Upload material**: PDF (read natively by the model, including figures), DOCX, Markdown, plain text, or pasted text
- **Context settings**: sector, year level, duration, class size, delivery mode, learner profile, and optional sequence context (previously covered / coming next / prior knowledge / assessment)
- **Three frameworks**: Gagné's Nine Events, BOPPPS, and the 5E Model — each with a plain-language explanation and "when to use" note
- **Structured generation**: Bloom-tagged objectives, timed segments that sum to the session length, formative checks with anticipated misconceptions, differentiation/UDL notes, a student-facing GenAI use statement, materials checklist, and homework bridge
- **Assumption surfacing**: the AI lists the assumptions it made so you can correct them
- **Conversational refinement**: "cut this to 40 minutes", "make the middle activity group-based" — the plan updates in place
- **Dashboard**: plans grouped by course, stored in your browser
- **Markdown export**

See [`lesson-plan-generator-concept.md`](./lesson-plan-generator-concept.md) for the full concept and roadmap (sequence linking, course map view, framework recommendation engine, standards mapping, and more).

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
```

Deployment is automatic: every push to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`.

## Notes & limitations

- You need an Anthropic API key ([platform.claude.com](https://platform.claude.com/)); usage is billed to your account. The default model is Claude Opus 4.8; Sonnet and Haiku are available in Settings for lower cost.
- Plans are stored in browser local storage — clearing site data deletes them. Export anything you want to keep as Markdown.
- PDFs up to ~30 MB are sent to the model as documents; DOCX files are converted to text in the browser.
