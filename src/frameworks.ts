export interface Framework {
  id: string;
  name: string;
  blurb: string;
  whenToUse: string;
  stages: string[];
  guidance: string;
}

export const FRAMEWORKS: Framework[] = [
  {
    id: "gagne",
    name: "Gagné's Nine Events of Instruction",
    blurb:
      "A systematic sequence of nine instructional events, from gaining attention through to enhancing retention and transfer. Grounded in cognitive information-processing theory, it maps each teaching move to a stage of how learners take in and store new material.",
    whenToUse:
      "Best for university teaching and structured skills instruction where content builds step by step and you want deliberate practice with feedback built in.",
    stages: [
      "Gain attention",
      "Inform learners of objectives",
      "Stimulate recall of prior learning",
      "Present the content",
      "Provide learning guidance",
      "Elicit performance (practice)",
      "Provide feedback",
      "Assess performance",
      "Enhance retention and transfer",
    ],
    guidance:
      "Structure the lesson around Gagné's nine events in order. Every segment must be tagged with the event it fulfils. The recall event should genuinely connect to the 'previously covered' context if provided. Practice (event 6) and feedback (event 7) should take a substantial share of the session time — do not let presentation dominate. The transfer event should point forward to the 'coming next' context if provided.",
  },
  {
    id: "boppps",
    name: "BOPPPS",
    blurb:
      "A six-part lesson structure — Bridge-in, Objectives, Pre-test, Participatory learning, Post-test, Summary — widely used in university instructional skills programs. Its hallmark is bracketing active learning between an explicit pre-check and post-check of understanding.",
    whenToUse:
      "Best for university lectures and tutorials, especially 50-minute sessions with defined pre-reading, where you want measurable evidence that the session moved learners.",
    stages: [
      "Bridge-in",
      "Objectives",
      "Pre-test",
      "Participatory learning",
      "Post-test",
      "Summary",
    ],
    guidance:
      "Structure the lesson using BOPPPS. The bridge-in must hook interest using the actual uploaded material, not a generic opener. The pre-test should be quick and low-stakes (show of hands, poll, one-minute write) and should exploit any pre-reading or prior-knowledge context provided. Participatory learning is the core — the majority of minutes go here, and learners must be doing something, not just listening. The post-test must directly mirror the objectives so the educator can see movement from pre to post.",
  },
  {
    id: "fivee",
    name: "5E Model (BSCS)",
    blurb:
      "An inquiry-based learning cycle — Engage, Explore, Explain, Elaborate, Evaluate — developed by BSCS Science Learning. Learners investigate phenomena before formal explanation, building understanding from their own observations.",
    whenToUse:
      "Best for K-12 (especially science) and any inquiry-driven session where you want learners to explore a phenomenon or problem before the formal explanation lands.",
    stages: ["Engage", "Explore", "Explain", "Elaborate", "Evaluate"],
    guidance:
      "Structure the lesson using the 5E cycle. Critically: Explore must come before Explain — learners investigate first, and the teacher's explanation then builds on what they found. The Engage phase should surface prior conceptions (and likely misconceptions) about the topic. Elaborate must apply the concept in a new context, not just repeat the exploration. Evaluate can be woven through but must include at least one concrete check aligned to the objectives.",
  },
];

export function getFramework(id: string): Framework {
  const fw = FRAMEWORKS.find((f) => f.id === id);
  if (!fw) throw new Error(`Unknown framework: ${id}`);
  return fw;
}
