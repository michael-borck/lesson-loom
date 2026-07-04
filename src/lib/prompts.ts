import type { ContextSettings, GeneratedPlan, ChatMessage } from "../types";
import type { Framework } from "../frameworks";

export const PLAN_SCHEMA = {
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
              "Learning objective starting with a Bloom-aligned verb — just the capability clause, e.g. 'explain the difference between X and Y'",
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

export const REFINE_SCHEMA = {
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

export const SYSTEM_PROMPT = `You are Lesson Loom, an expert instructional designer who turns an educator's actual teaching material into a rigorous, practical lesson plan.

Principles:
- Ground everything in the uploaded material. Reference its actual content, examples, and terminology — never produce a generic plan that could apply to any topic.
- Apply the chosen instructional design framework faithfully; tag every segment with the framework stage it fulfils.
- Segment minutes must sum exactly to the stated session duration.
- Write objectives with Bloom-aligned verbs and match activities and checks to those objectives (constructive alignment).
- Use the sequence context (previously covered / coming next / prior knowledge / assessment) to write genuine recap hooks, foreshadowing, and scaffolding — not generic openers.
- Be realistic about timing and cognitive load for the stated audience and class size.
- List the assumptions you made so the educator can correct them.
- Use plain, direct language an educator can act on in the room.`;

export function contextBlock(context: ContextSettings): string {
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

export function frameworkBlock(framework: Framework): string {
  return `Framework: ${framework.name}\nStages: ${framework.stages.join(" → ")}\nFramework guidance: ${framework.guidance}`;
}

/**
 * Builds the user-turn text for generation. Pass `materialText: null` when
 * the material is attached out-of-band (e.g. a native PDF document block on
 * the Anthropic API).
 */
export function buildGenerateText(
  framework: Framework,
  context: ContextSettings,
  materialName: string,
  materialText: string | null,
): string {
  const materialIntro =
    materialText === null
      ? `The teaching material is the attached PDF ("${materialName}").`
      : `The teaching material ("${materialName}") is:\n\n<material>\n${materialText}\n</material>`;
  return `${materialIntro}\n\n${contextBlock(context)}\n\n${frameworkBlock(framework)}\n\nGenerate the full lesson plan now.`;
}

export function buildRefineText(
  framework: Framework,
  context: ContextSettings,
  currentPlan: GeneratedPlan,
  chat: ChatMessage[],
  instruction: string,
): string {
  const transcript = chat
    .map((m) => `${m.role === "user" ? "Educator" : "Lesson Loom"}: ${m.text}`)
    .join("\n");
  return [
    `Here is the current lesson plan as JSON:\n\n<plan>\n${JSON.stringify(currentPlan, null, 2)}\n</plan>`,
    contextBlock(context),
    frameworkBlock(framework),
    transcript ? `Refinement conversation so far:\n${transcript}` : "",
    `The educator now asks:\n"${instruction}"\n\nApply the requested change (or answer the question) and return the FULL updated plan. Only change what the request requires — leave everything else exactly as it was. Keep segment minutes summing to the session duration. If the request is only a question, return the plan unchanged and answer in the note.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Tolerates code fences and prose around a JSON object. */
export function parseLenientJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("The model did not return valid JSON.");
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  }
}
