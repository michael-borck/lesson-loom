/**
 * Minimal OpenAI-compatible chat-completions client used for OpenAI,
 * OpenRouter, Ollama, custom endpoints, and the managed-server proxy.
 *
 * Structured output strategy: first try `response_format: json_schema`
 * (supported by OpenAI, OpenRouter, and recent Ollama). If the endpoint
 * rejects the request, retry once with the schema stated in the prompt and
 * parse leniently.
 */
import { parseLenientJson } from "./prompts";

export interface OpenAICompatTarget {
  baseUrl: string; // ends without trailing slash, includes /v1 where applicable
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
}

interface ChatOptions {
  system: string;
  user: string;
  schema: unknown;
  schemaName: string;
  onProgress?: (charsSoFar: number) => void;
}

async function readError(resp: Response): Promise<string> {
  let detail = "";
  try {
    detail = (await resp.text()).slice(0, 400);
  } catch {
    /* ignore */
  }
  return `Request failed (${resp.status} ${resp.statusText})${detail ? `: ${detail}` : ""}`;
}

async function streamCompletion(
  target: OpenAICompatTarget,
  body: Record<string, unknown>,
  onProgress?: (charsSoFar: number) => void,
): Promise<Response | string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(target.apiKey ? { authorization: `Bearer ${target.apiKey}` } : {}),
    ...target.extraHeaders,
  };
  const resp = await fetch(`${target.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!resp.ok) return resp;

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;
      const payload = data.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          onProgress?.(text.length);
        }
      } catch {
        /* ignore malformed keep-alive lines */
      }
    }
  }
  return text;
}

export async function chatJson<T>(
  target: OpenAICompatTarget,
  opts: ChatOptions,
): Promise<T> {
  if (!target.model.trim()) {
    throw new Error("No model set — enter a model name in Settings.");
  }
  const messages = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  // Attempt 1: native structured output.
  const first = await streamCompletion(
    target,
    {
      model: target.model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName, strict: true, schema: opts.schema },
      },
    },
    opts.onProgress,
  );
  if (typeof first === "string") return parseLenientJson<T>(first);

  // Endpoints that don't know json_schema tend to 400/404/422. Anything
  // else (401, 429, 5xx) is a real error — surface it.
  if (![400, 404, 415, 422].includes(first.status)) {
    throw new Error(await readError(first));
  }

  // Attempt 2: schema-in-prompt fallback.
  const fallbackMessages = [
    { role: "system", content: opts.system },
    {
      role: "user",
      content: `${opts.user}\n\nRespond with ONLY a single JSON object (no markdown fences, no commentary) that validates against this JSON Schema:\n${JSON.stringify(opts.schema)}`,
    },
  ];
  const second = await streamCompletion(
    target,
    { model: target.model, messages: fallbackMessages },
    opts.onProgress,
  );
  if (typeof second === "string") return parseLenientJson<T>(second);
  throw new Error(await readError(second));
}
