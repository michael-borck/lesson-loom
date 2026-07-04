import Anthropic from "@anthropic-ai/sdk";
import type {
  ContextSettings,
  GeneratedPlan,
  MaterialInput,
  ChatMessage,
} from "../types";
import type { Framework } from "../frameworks";
import {
  PLAN_SCHEMA,
  REFINE_SCHEMA,
  SYSTEM_PROMPT,
  buildGenerateText,
  buildRefineText,
} from "./prompts";

export interface AnthropicTarget {
  apiKey: string;
  model: string;
  /** Override for managed mode — points at the self-hosted proxy. */
  baseURL?: string;
  extraHeaders?: Record<string, string>;
}

function makeClient(target: AnthropicTarget): Anthropic {
  return new Anthropic({
    apiKey: target.apiKey,
    baseURL: target.baseURL,
    defaultHeaders: target.extraHeaders,
    dangerouslyAllowBrowser: true,
  });
}

// Adaptive thinking is supported on Opus 4.7+/Sonnet 5; Haiku 4.5 does not
// accept it, so omit the thinking param there.
function thinkingFor(model: string) {
  return model.startsWith("claude-haiku")
    ? {}
    : { thinking: { type: "adaptive" as const } };
}

function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function runStructured(
  target: AnthropicTarget,
  userContent: Anthropic.ContentBlockParam[],
  schema: unknown,
  onProgress?: (charsSoFar: number) => void,
): Promise<string> {
  const client = makeClient(target);
  let chars = 0;
  const stream = client.messages.stream({
    model: target.model,
    max_tokens: 32000,
    ...thinkingFor(target.model),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: { type: "json_schema", schema } },
  } as Anthropic.MessageStreamParams);
  stream.on("text", (t) => {
    chars += t.length;
    onProgress?.(chars);
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") {
    throw new Error("The model declined to process this request.");
  }
  return extractText(msg);
}

export async function anthropicGenerate(
  target: AnthropicTarget,
  framework: Framework,
  context: ContextSettings,
  material: MaterialInput,
  onProgress?: (charsSoFar: number) => void,
): Promise<GeneratedPlan> {
  const userContent: Anthropic.ContentBlockParam[] = [];
  if (material.kind === "pdf") {
    // PDFs go to the Anthropic API natively so the model can read figures.
    userContent.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: material.base64,
      },
    });
  }
  userContent.push({
    type: "text",
    text: buildGenerateText(
      framework,
      context,
      material.name,
      material.kind === "pdf" ? null : material.text,
    ),
  });
  const text = await runStructured(target, userContent, PLAN_SCHEMA, onProgress);
  return JSON.parse(text) as GeneratedPlan;
}

export async function anthropicRefine(
  target: AnthropicTarget,
  framework: Framework,
  context: ContextSettings,
  currentPlan: GeneratedPlan,
  chat: ChatMessage[],
  instruction: string,
  onProgress?: (charsSoFar: number) => void,
): Promise<{ note: string; plan: GeneratedPlan }> {
  const text = await runStructured(
    target,
    [
      {
        type: "text",
        text: buildRefineText(framework, context, currentPlan, chat, instruction),
      },
    ],
    REFINE_SCHEMA,
    onProgress,
  );
  return JSON.parse(text) as { note: string; plan: GeneratedPlan };
}
