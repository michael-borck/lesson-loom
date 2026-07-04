import type { ProviderId, ProviderConfig, Settings } from "../types";

export const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (best quality, default)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 (fast, lower cost)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest, cheapest)" },
];

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  baseUrlEditable: boolean;
  keyRequired: boolean;
  keyHint: string;
  modelHint: string;
  modelSuggestions: string[];
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    defaultBaseUrl: "",
    baseUrlEditable: false,
    keyRequired: true,
    keyHint: "Get a key at platform.claude.com. Billed to your account.",
    modelHint: "",
    modelSuggestions: [],
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    baseUrlEditable: false,
    keyRequired: true,
    keyHint: "Get a key at platform.openai.com. Billed to your account.",
    modelHint: "Type an OpenAI model name, e.g. a current GPT model.",
    modelSuggestions: ["gpt-5.2", "gpt-5.2-mini", "gpt-5.1", "gpt-4.1"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    baseUrlEditable: false,
    keyRequired: true,
    keyHint:
      "Get a key at openrouter.ai. OpenRouter is OpenAI-compatible and routes to many models.",
    modelHint:
      "Use an OpenRouter model slug, e.g. anthropic/claude-sonnet-5 or a provider/model of your choice.",
    modelSuggestions: [
      "anthropic/claude-opus-4.8",
      "anthropic/claude-sonnet-5",
      "openai/gpt-5.2",
      "meta-llama/llama-4-maverick",
    ],
  },
  {
    id: "ollama",
    label: "Ollama (local / self-hosted)",
    defaultBaseUrl: "http://localhost:11434/v1",
    baseUrlEditable: true,
    keyRequired: false,
    keyHint:
      "Optional — only needed if your Ollama sits behind an auth proxy (sent as a Bearer token). For a local Ollama, start it with OLLAMA_ORIGINS set to this site's origin (or \"*\") so the browser may call it.",
    modelHint: "A model you have pulled, e.g. llama3.3 or qwen3:32b.",
    modelSuggestions: ["llama3.3", "qwen3:32b", "gemma3:27b", "mistral-small"],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    defaultBaseUrl: "",
    baseUrlEditable: true,
    keyRequired: false,
    keyHint:
      "Any OpenAI-compatible endpoint (vLLM, LiteLLM, LM Studio, a corporate gateway…). Key sent as a Bearer token if provided.",
    modelHint: "Model name as your endpoint expects it.",
    modelSuggestions: [],
  },
];

export function providerMeta(id: ProviderId): ProviderMeta {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export function defaultConfigs(): Record<ProviderId, ProviderConfig> {
  return Object.fromEntries(
    PROVIDERS.map((p) => [
      p.id,
      {
        apiKey: "",
        model: p.id === "anthropic" ? "claude-opus-4-8" : "",
        baseUrl: p.defaultBaseUrl,
      },
    ]),
  ) as Record<ProviderId, ProviderConfig>;
}

export function defaultSettings(): Settings {
  return { provider: "anthropic", configs: defaultConfigs(), appPassword: "" };
}

export function activeConfig(settings: Settings): ProviderConfig {
  return settings.configs[settings.provider] ?? defaultConfigs()[settings.provider];
}
