import type { LessonPlan } from "../types";
import { getFramework } from "../frameworks";

export function planToMarkdown(plan: LessonPlan): string {
  const fw = getFramework(plan.frameworkId);
  const lines: string[] = [];

  lines.push(`# ${plan.title}`);
  lines.push("");
  lines.push(
    `**Course:** ${plan.course || "—"} · **Framework:** ${fw.name} · **Audience:** ${plan.context.sector}${plan.context.yearLevel ? ` (${plan.context.yearLevel})` : ""} · **Duration:** ${plan.context.duration} · **Mode:** ${plan.context.deliveryMode}`,
  );
  lines.push("");
  lines.push(plan.summary);
  lines.push("");

  lines.push("## Learning objectives");
  lines.push("");
  lines.push("By the end of this lesson, learners will be able to:");
  lines.push("");
  for (const o of plan.objectives) {
    lines.push(`- ${o.text} *(${o.bloomLevel})*`);
  }
  lines.push("");

  lines.push("## Timed activity breakdown");
  lines.push("");
  lines.push("| Min | Segment | Stage | Teacher | Learners | Materials |");
  lines.push("|---|---|---|---|---|---|");
  for (const s of plan.segments) {
    const esc = (t: string) => t.replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(
      `| ${s.minutes} | ${esc(s.name)} | ${esc(s.frameworkStage)} | ${esc(s.teacherActions)} | ${esc(s.learnerActions)} | ${esc(s.materials)} |`,
    );
  }
  const total = plan.segments.reduce((n, s) => n + s.minutes, 0);
  lines.push("");
  lines.push(`*Total: ${total} minutes*`);
  lines.push("");

  if (plan.formativeChecks.length) {
    lines.push("## Formative checks");
    lines.push("");
    for (const c of plan.formativeChecks) {
      lines.push(`- **Ask:** ${c.question}`);
      lines.push(`  - *Watch for:* ${c.anticipatedMisconceptions}`);
    }
    lines.push("");
  }

  if (plan.differentiation.length) {
    lines.push("## Differentiation & UDL");
    lines.push("");
    for (const d of plan.differentiation) lines.push(`- ${d}`);
    lines.push("");
  }

  lines.push("## GenAI use statement (student-facing)");
  lines.push("");
  lines.push(`> ${plan.aiUseStatement}`);
  lines.push("");

  if (plan.materialsChecklist.length) {
    lines.push("## Materials & preparation checklist");
    lines.push("");
    for (const m of plan.materialsChecklist) lines.push(`- [ ] ${m}`);
    lines.push("");
  }

  if (plan.homework) {
    lines.push("## Homework / bridge to next session");
    lines.push("");
    lines.push(plan.homework);
    lines.push("");
  }

  if (plan.assumptions.length) {
    lines.push("## Assumptions made by the generator");
    lines.push("");
    for (const a of plan.assumptions) lines.push(`- ${a}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(
    `*Generated with Lesson Loom from “${plan.materialName}” · ${new Date(plan.updatedAt).toLocaleDateString()}*`,
  );
  return lines.join("\n");
}

export function downloadMarkdown(plan: LessonPlan): void {
  const md = planToMarkdown(plan);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${plan.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase() || "lesson-plan"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
