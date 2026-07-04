import { useState } from "react";
import type {
  ContextSettings,
  LessonPlan,
  MaterialInput,
  Settings,
} from "../types";
import { FRAMEWORKS } from "../frameworks";
import { extractMaterial } from "../lib/extract";
import { generatePlan, settingsProblem } from "../lib/llm";
import type { ServerConfig } from "../lib/serverConfig";
import { upsertPlan } from "../lib/storage";
import { navigate } from "../App";

const SECTORS = [
  "K-12",
  "Undergraduate",
  "Postgraduate",
  "VET / vocational",
  "Executive education",
  "Corporate training",
];
const DURATIONS = [
  "30 minutes",
  "50 minutes",
  "60 minutes",
  "90 minutes",
  "2 hour workshop",
  "Half day",
  "Full day",
];
const MODES = ["Face-to-face", "Online synchronous", "Hybrid", "Self-paced"];
const AI_POLICIES = [
  "Not permitted",
  "Permitted with acknowledgement",
  "Actively required",
];

const DEFAULT_CONTEXT: ContextSettings = {
  sector: "Undergraduate",
  yearLevel: "",
  duration: "50 minutes",
  classSize: "",
  deliveryMode: "Face-to-face",
  learnerProfile: "",
  existingObjectives: "",
  previouslyCovered: "",
  comingNext: "",
  priorKnowledge: "",
  assessmentContext: "",
  aiPolicy: "Permitted with acknowledgement",
};

export function NewLesson({
  settings,
  server,
  plans,
  onPlansChange,
}: {
  settings: Settings;
  server: ServerConfig | null;
  plans: LessonPlan[];
  onPlansChange: (plans: LessonPlan[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [material, setMaterial] = useState<MaterialInput | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [pastedName, setPastedName] = useState("");
  const [course, setCourse] = useState("");
  const [context, setContext] = useState<ContextSettings>(DEFAULT_CONTEXT);
  const [frameworkId, setFrameworkId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const existingCourses = [
    ...new Set(plans.map((p) => p.course.trim()).filter(Boolean)),
  ];

  const set = <K extends keyof ContextSettings>(
    key: K,
    value: ContextSettings[K],
  ) => setContext((c) => ({ ...c, [key]: value }));

  async function onFile(file: File) {
    setError("");
    try {
      setMaterial(await extractMaterial(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function usePastedText() {
    if (!pastedText.trim()) {
      setError("Paste some material first.");
      return;
    }
    setError("");
    setMaterial({
      kind: "text",
      name: pastedName.trim() || "Pasted material",
      text: pastedText,
    });
  }

  async function onGenerate() {
    const problem = settingsProblem(settings, server);
    if (problem) {
      setError(problem);
      return;
    }
    if (!material || !frameworkId) return;
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const framework = FRAMEWORKS.find((f) => f.id === frameworkId)!;
      const generated = await generatePlan(
        settings,
        server,
        framework,
        context,
        material,
        setProgress,
      );
      const now = new Date().toISOString();
      const plan: LessonPlan = {
        ...generated,
        id: crypto.randomUUID(),
        course,
        frameworkId,
        context,
        materialName: material.name,
        createdAt: now,
        updatedAt: now,
        chat: [],
      };
      onPlansChange(upsertPlan(plan));
      navigate(`/plan/${plan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const steps = ["Material", "Context", "Framework", "Generate"];

  return (
    <div className="panel wizard">
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? "active" : i < step ? "done" : ""}>
            {s}
          </li>
        ))}
      </ol>

      {error && <div className="error">{error}</div>}

      {step === 0 && (
        <section>
          <h2>1 · Your teaching material</h2>
          <p className="hint">
            Start from what you actually teach with — a lecture, worksheet,
            reading, case study, or outline. PDF, DOCX, Markdown, or plain
            text.
          </p>
          <label className="dropzone">
            <input
              type="file"
              accept=".pdf,.docx,.md,.markdown,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            {material ? (
              <span>
                ✓ <strong>{material.name}</strong>
                {material.kind === "text"
                  ? ` — ${material.text.length.toLocaleString()} characters extracted`
                  : " — PDF will be read directly by the model"}
              </span>
            ) : (
              <span>Click to choose a file (or drop one here)</span>
            )}
          </label>
          <details className="paste-details" open={!material}>
            <summary>…or paste material as text</summary>
            <input
              type="text"
              placeholder="Name this material (e.g. Week 4 lecture notes)"
              value={pastedName}
              onChange={(e) => setPastedName(e.target.value)}
            />
            <textarea
              rows={8}
              placeholder="Paste lecture notes, a reading, an activity sheet…"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <button className="btn btn-ghost" onClick={usePastedText}>
              Use this text
            </button>
          </details>
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={!material}
              onClick={() => setStep(1)}
            >
              Next: context →
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2>2 · Audience & context</h2>
          <div className="field-grid">
            <label className="field">
              <span>Course / unit (for the dashboard)</span>
              <input
                list="courses"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. ISYS2001 Intro to Business Programming"
              />
              <datalist id="courses">
                {existingCourses.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Sector</span>
              <select
                value={context.sector}
                onChange={(e) => set("sector", e.target.value)}
              >
                {SECTORS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {context.sector === "K-12" && (
              <label className="field">
                <span>Year level</span>
                <input
                  value={context.yearLevel}
                  onChange={(e) => set("yearLevel", e.target.value)}
                  placeholder="e.g. Year 9"
                />
              </label>
            )}
            <label className="field">
              <span>Duration</span>
              <select
                value={context.duration}
                onChange={(e) => set("duration", e.target.value)}
              >
                {DURATIONS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Class size</span>
              <input
                value={context.classSize}
                onChange={(e) => set("classSize", e.target.value)}
                placeholder="e.g. 25"
              />
            </label>
            <label className="field">
              <span>Delivery mode</span>
              <select
                value={context.deliveryMode}
                onChange={(e) => set("deliveryMode", e.target.value)}
              >
                {MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>GenAI policy for this lesson</span>
              <select
                value={context.aiPolicy}
                onChange={(e) => set("aiPolicy", e.target.value)}
              >
                {AI_POLICIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Learner profile (optional)</span>
            <textarea
              rows={2}
              value={context.learnerProfile}
              onChange={(e) => set("learnerProfile", e.target.value)}
              placeholder="e.g. mid-career managers, low technical background; mixed-ability class"
            />
          </label>
          <label className="field">
            <span>Learning objectives (optional — leave blank to draft from the material)</span>
            <textarea
              rows={3}
              value={context.existingObjectives}
              onChange={(e) => set("existingObjectives", e.target.value)}
              placeholder="Paste existing objectives, one per line"
            />
          </label>
          <details className="seq-details">
            <summary>Where does this lesson sit in the sequence? (optional, improves recap & foreshadowing)</summary>
            <label className="field">
              <span>Previously covered</span>
              <textarea
                rows={2}
                value={context.previouslyCovered}
                onChange={(e) => set("previouslyCovered", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Coming next</span>
              <textarea
                rows={2}
                value={context.comingNext}
                onChange={(e) => set("comingNext", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Assumed prior knowledge</span>
              <textarea
                rows={2}
                value={context.priorKnowledge}
                onChange={(e) => set("priorKnowledge", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Assessment this lesson feeds into</span>
              <textarea
                rows={2}
                value={context.assessmentContext}
                onChange={(e) => set("assessmentContext", e.target.value)}
              />
            </label>
          </details>
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              ← Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Next: framework →
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>3 · Choose a framework</h2>
          <div className="fw-grid">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.id}
                className={`fw-card ${frameworkId === fw.id ? "selected" : ""}`}
                onClick={() => setFrameworkId(fw.id)}
              >
                <h3>{fw.name}</h3>
                <p>{fw.blurb}</p>
                <p className="fw-when">
                  <strong>When to use:</strong> {fw.whenToUse}
                </p>
                <p className="fw-stages">{fw.stages.join(" → ")}</p>
              </button>
            ))}
          </div>
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!frameworkId}
              onClick={() => setStep(3)}
            >
              Next: generate →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>4 · Generate</h2>
          <ul className="review-list">
            <li>
              <strong>Material:</strong> {material?.name}
            </li>
            <li>
              <strong>Audience:</strong> {context.sector}
              {context.yearLevel ? ` (${context.yearLevel})` : ""} ·{" "}
              {context.duration} · {context.deliveryMode}
            </li>
            <li>
              <strong>Framework:</strong>{" "}
              {FRAMEWORKS.find((f) => f.id === frameworkId)?.name}
            </li>
            <li>
              <strong>GenAI policy:</strong> {context.aiPolicy}
            </li>
          </ul>
          {busy ? (
            <div className="generating">
              <div className="spinner" />
              <p>
                Weaving your lesson plan…{" "}
                {progress > 0 && (
                  <span className="hint">
                    {progress.toLocaleString()} characters received
                  </span>
                )}
              </p>
              <p className="hint">
                This can take a minute or two — the model reads your material,
                thinks through the design, and produces the full timed plan.
              </p>
            </div>
          ) : (
            <div className="actions">
              <button className="btn btn-ghost" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button className="btn btn-primary btn-lg" onClick={onGenerate}>
                ✨ Generate lesson plan
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
