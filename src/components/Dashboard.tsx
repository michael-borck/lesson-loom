import type { LessonPlan } from "../types";
import { getFramework } from "../frameworks";
import { deletePlan } from "../lib/storage";
import { downloadMarkdown } from "../lib/markdown";

export function Dashboard({
  plans,
  onPlansChange,
}: {
  plans: LessonPlan[];
  onPlansChange: (plans: LessonPlan[]) => void;
}) {
  if (plans.length === 0) {
    return (
      <div className="empty">
        <h2>Weave your first lesson plan</h2>
        <p>
          Upload a lecture, worksheet, reading, or outline; choose your
          audience and a pedagogical framework; and get a structured,
          timed lesson plan you can refine in conversation.
        </p>
        <a href="#/new" className="btn btn-primary btn-lg">
          + New lesson plan
        </a>
        <p className="hint">
          You'll need an Anthropic API key — set it in{" "}
          <a href="#/settings">Settings</a>.
        </p>
      </div>
    );
  }

  const courses = new Map<string, LessonPlan[]>();
  for (const p of plans) {
    const key = p.course.trim() || "Uncategorised";
    if (!courses.has(key)) courses.set(key, []);
    courses.get(key)!.push(p);
  }

  return (
    <div className="dashboard">
      {[...courses.entries()].map(([course, coursePlans]) => (
        <section key={course} className="course-group">
          <h2>{course}</h2>
          <div className="card-grid">
            {coursePlans.map((p) => (
              <div key={p.id} className="plan-card">
                <a href={`#/plan/${p.id}`} className="plan-card-main">
                  <h3>{p.title}</h3>
                  <p className="plan-meta">
                    {getFramework(p.frameworkId).name} · {p.context.duration} ·{" "}
                    {p.context.sector}
                  </p>
                  <p className="plan-summary">{p.summary}</p>
                </a>
                <div className="plan-card-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => downloadMarkdown(p)}
                    title="Export as Markdown"
                  >
                    ⬇ .md
                  </button>
                  <button
                    className="btn btn-ghost btn-sm danger"
                    onClick={() => {
                      if (confirm(`Delete "${p.title}"? This cannot be undone.`))
                        onPlansChange(deletePlan(p.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
