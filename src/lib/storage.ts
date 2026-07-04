import type { LessonPlan, Settings } from "../types";

const PLANS_KEY = "lessonloom.plans";
const SETTINGS_KEY = "lessonloom.settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as Settings;
  } catch {
    /* fall through to defaults */
  }
  return { apiKey: "", model: "claude-opus-4-8" };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadPlans(): LessonPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (raw) return JSON.parse(raw) as LessonPlan[];
  } catch {
    /* corrupted store — start fresh */
  }
  return [];
}

export function savePlans(plans: LessonPlan[]): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function upsertPlan(plan: LessonPlan): LessonPlan[] {
  const plans = loadPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) plans[idx] = plan;
  else plans.unshift(plan);
  savePlans(plans);
  return plans;
}

export function deletePlan(id: string): LessonPlan[] {
  const plans = loadPlans().filter((p) => p.id !== id);
  savePlans(plans);
  return plans;
}
