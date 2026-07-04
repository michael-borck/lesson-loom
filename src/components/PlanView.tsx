import { useState } from "react";
import type { LessonPlan, Settings } from "../types";
import { getFramework } from "../frameworks";
import { refinePlan } from "../lib/anthropic";
import { upsertPlan } from "../lib/storage";
import { downloadMarkdown } from "../lib/markdown";

const QUICK_ACTIONS = [
  "Make the middle activity group-based",
  "Cut this to 40 minutes",
  "Lower the reading level",
  "Add a role-play activity",
  "Review this plan for constructive alignment and timing realism",
];

export function PlanView({
  plan,
  settings,
  onPlansChange,
}: {
  plan: LessonPlan;
  settings: Settings;
  onPlansChange: (plans: LessonPlan[]) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fw = getFramework(plan.frameworkId);
  const totalMinutes = plan.segments.reduce((n, s) => n + s.minutes, 0);

  async function send(instruction: string) {
    const text = instruction.trim();
    if (!text || busy) return;
    if (!settings.apiKey) {
      setError("Set your Anthropic API key in Settings first.");
      return;
    }
    setBusy(true);
    setError("");
    setInput("");
    try {
      const result = await refinePlan(
        settings,
        fw,
        plan.context,
        plan,
        plan.chat,
        text,
      );
      const updated: LessonPlan = {
        ...plan,
        ...result.plan,
        updatedAt: new Date().toISOString(),
        chat: [
          ...plan.chat,
          { role: "user", text },
          { role: "assistant", text: result.note },
        ],
      };
      onPlansChange(upsertPlan(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="plan-layout">
      <article className="plan-doc">
        <header className="plan-header">
          <div>
            <h1>{plan.title}</h1>
            <p className="plan-meta">
              {plan.course && <>{plan.course} · </>}
              {fw.name} · {plan.context.sector}
              {plan.context.yearLevel ? ` (${plan.context.yearLevel})` : ""} ·{" "}
              {plan.context.duration} · {plan.context.deliveryMode}
            </p>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => downloadMarkdown(plan)}
          >
            ⬇ Export .md
          </button>
        </header>

        <p className="plan-summary">{plan.summary}</p>

        <h2>Learning objectives</h2>
        <p className="hint">By the end of this lesson, learners will be able to:</p>
        <ul>
          {plan.objectives.map((o, i) => (
            <li key={i}>
              {o.text} <span className={`bloom bloom-${o.bloomLevel.toLowerCase()}`}>{o.bloomLevel}</span>
            </li>
          ))}
        </ul>

        <h2>
          Timed activity breakdown{" "}
          <span className="hint">({totalMinutes} min total)</span>
        </h2>
        <div className="timeline">
          {plan.segments.map((s, i) => (
            <div key={i} className="segment">
              <div className="segment-head">
                <span className="segment-minutes">{s.minutes} min</span>
                <strong>{s.name}</strong>
                <span className="segment-stage">{s.frameworkStage}</span>
              </div>
              <div className="segment-body">
                <p>
                  <strong>Teacher:</strong> {s.teacherActions}
                </p>
                <p>
                  <strong>Learners:</strong> {s.learnerActions}
                </p>
                {s.materials && (
                  <p>
                    <strong>Materials:</strong> {s.materials}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {plan.formativeChecks.length > 0 && (
          <>
            <h2>Formative checks</h2>
            <ul>
              {plan.formativeChecks.map((c, i) => (
                <li key={i}>
                  <strong>Ask:</strong> {c.question}
                  <br />
                  <span className="hint">
                    Watch for: {c.anticipatedMisconceptions}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {plan.differentiation.length > 0 && (
          <>
            <h2>Differentiation & UDL</h2>
            <ul>
              {plan.differentiation.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </>
        )}

        <h2>GenAI use statement (student-facing)</h2>
        <blockquote>{plan.aiUseStatement}</blockquote>

        {plan.materialsChecklist.length > 0 && (
          <>
            <h2>Materials & preparation</h2>
            <ul className="checklist">
              {plan.materialsChecklist.map((m, i) => (
                <li key={i}>☐ {m}</li>
              ))}
            </ul>
          </>
        )}

        {plan.homework && (
          <>
            <h2>Homework / bridge to next session</h2>
            <p>{plan.homework}</p>
          </>
        )}

        {plan.assumptions.length > 0 && (
          <details className="assumptions">
            <summary>Assumptions the generator made ({plan.assumptions.length})</summary>
            <ul>
              {plan.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </details>
        )}
      </article>

      <aside className="refine-panel">
        <h2>Refine with AI</h2>
        <p className="hint">
          Generation is the start of the conversation. Ask for changes and the
          plan updates in place.
        </p>
        <div className="quick-actions">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q}
              className="chip"
              disabled={busy}
              onClick={() => void send(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="chat-log">
          {plan.chat.length === 0 && (
            <p className="hint">No refinements yet.</p>
          )}
          {plan.chat.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              {m.text}
            </div>
          ))}
          {busy && (
            <div className="chat-msg assistant pending">
              <span className="spinner spinner-sm" /> Reworking the plan…
            </div>
          )}
        </div>
        {error && <div className="error">{error}</div>}
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            rows={2}
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder='e.g. "regenerate just the warm-up" or "make it suitable for online delivery"'
          />
          <button className="btn btn-primary" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </aside>
    </div>
  );
}
