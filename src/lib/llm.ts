/**
 * Unified LLM entry point. Resolves the user's settings (plus managed-server
 * config, if this is a self-hosted instance) into a concrete runtime target,
 * then dispatches to the Anthropic client or the OpenAI-compatible client.
 */
import type {
  ContextSettings,
  GeneratedPlan,
  MaterialInput,
  Settings,
  ChatMessage,
} from "../types";
import type { Framework } from "../frameworks";
import type { ServerConfig } from "./serverConfig";
import { apiBase } from "./serverConfig";
import { activeConfig, providerMeta } from "./providers";
import { anthropicGenerate, anthropicRefine } from "./anthropic";
import { chatJson } from "./openaiCompat";
import {
  PLAN_SCHEMA,
  REFINE_SCHEMA,
  SYSTEM_PROMPT,
  buildGenerateText,
  buildRefineText,
} from "./prompts";

type Target =
  | {
      type: "anthropic";
      apiKey: string;
      model: string;
      baseURL?: string;
      extraHeaders?: Record<string, string>;
    }
  | {
      type: "openai";
      apiKey: string;
      model: string;
      baseUrl: string;
      extraHeaders?: Record<string, string>;
    };

/** Returns a human-readable problem with the current settings, or null if ready. */
export function settingsProblem(
  settings: Settings,
  server: ServerConfig | null,
): string | null {
  if (server) {
    if (server.requiresPassword && !settings.appPassword) {
      return "This instance requires an access password — enter it in Settings.";
    }
    const cfg = activeConfig(settings);
    if (settings.provider === "anthropic" && !server.anthropic) {
      return "This server has no Anthropic key configured — pick the server's provider in Settings.";
    }
    if (settings.provider !== "anthropic" && !server.openaiCompat) {
      return "This server has no OpenAI-compatible endpoint configured — pick Anthropic in Settings.";
    }
    if (settings.provider !== "anthropic" && !cfg.model.trim()) {
      return "Choose a model in Settings.";
    }
    return null;
  }
  const meta = providerMeta(settings.provider);
  const cfg = activeConfig(settings);
  if (meta.keyRequired && !cfg.apiKey) {
    return `Set your ${meta.label} API key in Settings.`;
  }
  if (settings.provider !== "anthropic" && !cfg.model.trim()) {
    return "Enter a model name in Settings.";
  }
  if (meta.baseUrlEditable && !cfg.baseUrl.trim()) {
    return "Enter the endpoint base URL in Settings.";
  }
  return null;
}

function resolveTarget(settings: Settings, server: ServerConfig | null): Target {
  const cfg = activeConfig(settings);
  if (server) {
    const extraHeaders = settings.appPassword
      ? { "x-app-password": settings.appPassword }
      : undefined;
    if (settings.provider === "anthropic" && server.anthropic) {
      return {
        type: "anthropic",
        apiKey: "managed-by-server",
        model: cfg.model || server.anthropic.models[0] || "claude-opus-4-8",
        baseURL: `${apiBase()}/anthropic`,
        extraHeaders,
      };
    }
    return {
      type: "openai",
      apiKey: "", // injected server-side
      model: cfg.model || server.openaiCompat?.models[0] || "",
      baseUrl: `${apiBase()}/openai/v1`,
      extraHeaders,
    };
  }
  if (settings.provider === "anthropic") {
    return { type: "anthropic", apiKey: cfg.apiKey, model: cfg.model };
  }
  return {
    type: "openai",
    apiKey: cfg.apiKey,
    model: cfg.model,
    baseUrl: cfg.baseUrl.replace(/\/+$/, ""),
  };
}

export async function generatePlan(
  settings: Settings,
  server: ServerConfig | null,
  framework: Framework,
  context: ContextSettings,
  material: MaterialInput,
  onProgress?: (charsSoFar: number) => void,
): Promise<GeneratedPlan> {
  const target = resolveTarget(settings, server);
  if (target.type === "anthropic") {
    return anthropicGenerate(target, framework, context, material, onProgress);
  }
  if (material.kind === "pdf" && !material.text.trim()) {
    throw new Error(
      "No text could be extracted from this PDF (it may be scanned images). Use the Anthropic provider — which reads PDFs natively — or upload the material as DOCX/text.",
    );
  }
  return chatJson<GeneratedPlan>(target, {
    system: SYSTEM_PROMPT,
    user: buildGenerateText(framework, context, material.name, material.text),
    schema: PLAN_SCHEMA,
    schemaName: "lesson_plan",
    onProgress,
  });
}

export async function refinePlan(
  settings: Settings,
  server: ServerConfig | null,
  framework: Framework,
  context: ContextSettings,
  currentPlan: GeneratedPlan,
  chat: ChatMessage[],
  instruction: string,
  onProgress?: (charsSoFar: number) => void,
): Promise<{ note: string; plan: GeneratedPlan }> {
  const target = resolveTarget(settings, server);
  if (target.type === "anthropic") {
    return anthropicRefine(
      target,
      framework,
      context,
      currentPlan,
      chat,
      instruction,
      onProgress,
    );
  }
  return chatJson<{ note: string; plan: GeneratedPlan }>(target, {
    system: SYSTEM_PROMPT,
    user: buildRefineText(framework, context, currentPlan, chat, instruction),
    schema: REFINE_SCHEMA,
    schemaName: "lesson_plan_refinement",
    onProgress,
  });
}
