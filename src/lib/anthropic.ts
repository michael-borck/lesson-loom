import Anthropic from "@anthropic-ai/sdk";
import type {
  ContextSettings,
  GeneratedPlan,
  MaterialInput,
  Settings,
  ChatMessage,
} from "../types";
import type { Framework } from "../frameworks";

export const MODELS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (best quality, default)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 (fast, lower cost)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest, cheapest)" },
];

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "objectives",
    "segments",
    "formativeChecks",
    "differentiation",
    "aiUseStatement",
    "materialsChecklist",
    "homework",
    "assumptions",
  ],
  properties: {
    title: { type: "string", description: "Concise lesson title" },
    summary: {
      type: "string",
      description: "2-3 sentence overview of the lesson",
    },
    objectives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "bloomLevel"],
        properties: {
          text: {
            type: "string",
            description:
              "Learning objective starting with a Bloom-aligned verb, phrased as 'By the end of this lesson, learners will be able to ...' but written as just the capability clause",
          },
          bloomLevel: {
            type: "string",
            enum: [
              "Remember",
              "Understand",
              "Apply",
              "Analyse",
              "Evaluate",
              "Create",
            ],
          },
        },
      },
    },
    segments: {
      type: "array",
      description:
        "Timed activity breakdown. Minutes MUST sum to the session duration.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "minutes",
          "frameworkStage",
          "teacherActions",
          "learnerActions",
          "materials",
        ],
        properties: {
          name: { type: "string" },
          minutes: { type: "integer" },
          frameworkStage: {
            type: "string",
            description: "Which stage of the chosen framework this fulfils",
          },
          teacherActions: { type: "string" },
          learnerActions: { type: "string" },
          materials: { type: "string" },
        },
      },
    },
    formativeChecks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "anticipatedMisconceptions"],
        properties: {
          question: { type: "string" },
          anticipatedMisconceptions: { type: "string" },
        },
      },
    },
    differentiation: {
      type: "array",
      items: { type: "string" },
      description:
        "Differentiation and UDL notes: multiple means of engagement, representation, action/expression",
    },
    aiUseStatement: {
      type: "string",
      description:
        "Student-facing statement about permitted GenAI use for this lesson, matching the educator's stated AI policy",
    },
    materialsChecklist: { type: "array", items: { type: "string" } },
    homework: {
      type: "string",
      description:
        "Homework or bridge to the next session, informed by the sequence context if provided",
    },
    assumptions: {
      type: "array",
      items: { type: "string" },
      description:
        "Assumptions made while generating (class size, tech available, prior knowledge) so the educator can correct them",
    },
  },
} as const;

const REFINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["note", "plan"],
  properties: {
    note: {
      type: "string",
      description:
        "A short conversational reply to the educator summarising what changed and why (or answering their question). This is shown in the chat.",
    },
    plan: PLAN_SCHEMA,
  },
} as const;

const SYSTEM_PROMPT = `You are Lesson Loom, an expert instructional designer who turns an educator's actual teaching material into a rigorous, practical lesson plan.

Principles:
- Ground everything in the uploaded material. Reference its actual content, examples, and terminology — never produce a generic plan that could apply to any topic.
- Apply the chosen instructional design framework faithfully; tag every segment with the framework stage it fulfils.
- Segment minutes must sum exactly to the stated session duration.
- Write objectives with Bloom-aligned verbs and match activities and checks to those objectives (constructive alignment).
- Use the sequence context (previously covered / coming next / prior knowledge / assessment) to write genuine recap hooks, foreshadowing, and scaffolding — not generic openers.
- Be realistic about timing and cognitive load for the stated audience and class size.
- List the assumptions you made so the educator can correct them.
- Use plain, direct language an educator can act on in the room.`;

function makeClient(settings: Settings): Anthropic {
  return new Anthropic({
    apiKey: settings.apiKey,
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

function contextBlock(context: ContextSettings): string {
  const lines = [
    `Sector / audience: ${context.sector}${context.yearLevel ? ` (${context.yearLevel})` : ""}`,
    `Session duration: ${context.duration}`,
    `Class size: ${context.classSize || "not specified"}`,
    `Delivery mode: ${context.deliveryMode}`,
  ];
  if (context.learnerProfile)
    lines.push(`Learner profile: ${context.learnerProfile}`);
  if (context.existingObjectives)
    lines.push(
      `Educator-supplied learning objectives (use these, refine wording only if needed):\n${context.existingObjectives}`,
    );
  if (context.previouslyCovered)
    lines.push(`Previously covered: ${context.previouslyCovered}`);
  if (context.comingNext) lines.push(`Coming next: ${context.comingNext}`);
  if (context.priorKnowledge)
    lines.push(`Assumed prior knowledge: ${context.priorKnowledge}`);
  if (context.assessmentContext)
    lines.push(`Assessment context: ${context.assessmentContext}`);
  lines.push(`GenAI policy for this lesson: ${context.aiPolicy}`);
  return lines.join("\n");
}

function frameworkBlock(framework: Framework): string {
  return `Framework: ${framework.name}\nStages: ${framework.stages.join(" → ")}\nFramework guidance: ${framework.guidance}`;
}

function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function generatePlan(
  settings: Settings,
  framework: Framework,
  context: ContextSettings,
  material: MaterialInput,
  onProgress?: (charsSoFar: number) => void,
): Promise<GeneratedPlan> {
  const client = makeClient(settings);

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (material.kind === "pdf") {
    userContent.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: material.base64,
      },
    });
  }
  const materialIntro =
    material.kind === "pdf"
      ? `The teaching material is the attached PDF ("${material.name}").`
      : `The teaching material ("${material.name}") is:\n\n<material>\n${material.text}\n</material>`;

  userContent.push({
    type: "text",
    text: `${materialIntro}\n\n${contextBlock(context)}\n\n${frameworkBlock(framework)}\n\nGenerate the full lesson plan now.`,
  });

  let chars = 0;
  const stream = client.messages.stream({
    model: settings.model,
    max_tokens: 32000,
    ...thinkingFor(settings.model),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
  } as Anthropic.MessageStreamParams);
  stream.on("text", (t) => {
    chars += t.length;
    onProgress?.(chars);
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") {
    throw new Error("The model declined to process this material.");
  }
  return JSON.parse(extractText(msg)) as GeneratedPlan;
}

export async function refinePlan(
  settings: Settings,
  framework: Framework,
  context: ContextSettings,
  currentPlan: GeneratedPlan,
  chat: ChatMessage[],
  instruction: string,
  onProgress?: (charsSoFar: number) => void,
): Promise<{ note: string; plan: GeneratedPlan }> {
  const client = makeClient(settings);

  const transcript = chat
    .map((m) => `${m.role === "user" ? "Educator" : "Lesson Loom"}: ${m.text}`)
    .join("\n");

  const text = [
    `Here is the current lesson plan as JSON:\n\n<plan>\n${JSON.stringify(currentPlan, null, 2)}\n</plan>`,
    contextBlock(context),
    frameworkBlock(framework),
    transcript ? `Refinement conversation so far:\n${transcript}` : "",
    `The educator now asks:\n"${instruction}"\n\nApply the requested change (or answer the question) and return the FULL updated plan. Only change what the request requires — leave everything else exactly as it was. Keep segment minutes summing to the session duration. If the request is only a question, return the plan unchanged and answer in the note.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let chars = 0;
  const stream = client.messages.stream({
    model: settings.model,
    max_tokens: 32000,
    ...thinkingFor(settings.model),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: [{ type: "text", text }] }],
    output_config: { format: { type: "json_schema", schema: REFINE_SCHEMA } },
  } as Anthropic.MessageStreamParams);
  stream.on("text", (t) => {
    chars += t.length;
    onProgress?.(chars);
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") {
    throw new Error("The model declined this request.");
  }
  return JSON.parse(extractText(msg)) as { note: string; plan: GeneratedPlan };
}
