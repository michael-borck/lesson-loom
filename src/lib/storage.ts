import type { LessonPlan, Settings } from "../types";
import { defaultSettings } from "./providers";

const PLANS_KEY = "lessonloom.plans";
const SETTINGS_KEY = "lessonloom.settings";

export function loadSettings(): Settings {
  const defaults = defaultSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings> & {
      // pre-multi-provider shape
      apiKey?: string;
      model?: string;
    };
    if (parsed.configs && parsed.provider) {
      return {
        ...defaults,
        ...parsed,
        configs: { ...defaults.configs, ...parsed.configs },
      } as Settings;
    }
    // Migrate the original single-provider (Anthropic) settings shape.
    if (typeof parsed.apiKey === "string") {
      defaults.configs.anthropic.apiKey = parsed.apiKey;
      if (parsed.model) defaults.configs.anthropic.model = parsed.model;
      saveSettings(defaults);
    }
    return defaults;
  } catch {
    return defaults;
  }
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
