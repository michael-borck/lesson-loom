/**
 * Captures landing-page screenshots and the app icon using the locally
 * installed Chrome (via playwright-core; no browser download).
 *
 *   node scripts/capture.mjs            # screenshots + icon source PNG
 *
 * Then regenerate Tauri icons with:  npx tauri icon src-tauri/icon-source.png
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "landing", "shots");
const PORT = 5199;

const demoContext = {
  sector: "Undergraduate",
  yearLevel: "",
  duration: "50 minutes",
  classSize: "28",
  deliveryMode: "Face-to-face",
  learnerProfile: "First-year business students, most with no programming background",
  existingObjectives: "",
  previouslyCovered: "Variables, expressions, and input/output in Python",
  comingNext: "Functions and decomposition",
  priorKnowledge: "Can write and run a simple sequential Python script",
  assessmentContext: "Feeds into the Week 6 programming quiz",
  aiPolicy: "Permitted with acknowledgement",
};

const demoPlan = {
  id: "demo-plan-1",
  course: "ISYS2001 Introduction to Business Programming",
  frameworkId: "boppps",
  context: demoContext,
  materialName: "week4-loops-lecture.pdf",
  createdAt: "2026-06-29T02:00:00.000Z",
  updatedAt: "2026-07-02T05:30:00.000Z",
  chat: [
    { role: "user", text: "Make the participatory section pair-based" },
    {
      role: "assistant",
      text: "Done — the loop-tracing activity now runs in pairs: one student predicts each iteration aloud while the other checks against the debugger, swapping halfway. Timing is unchanged.",
    },
  ],
  title: "Repeating Yourself (Well): for-loops over Business Data",
  summary:
    "Students move from copy-pasted repetition to for-loops, using the sales-data examples from the Week 4 lecture. The session centres on live loop tracing and a paired prediction activity, closing with a post-test that mirrors the objectives.",
  objectives: [
    { text: "explain why loops replace repeated code, using the sales-report example", bloomLevel: "Understand" },
    { text: "trace the execution of a for-loop over a list, predicting output at each iteration", bloomLevel: "Apply" },
    { text: "write a for-loop that aggregates values from a list of transactions", bloomLevel: "Apply" },
    { text: "identify off-by-one and accumulator-reset errors in a given loop", bloomLevel: "Analyse" },
  ],
  segments: [
    {
      name: "Bridge-in: the 47-line sales report",
      minutes: 5,
      frameworkStage: "Bridge-in",
      teacherActions: "Show the copy-pasted 47-line report script from the lecture; ask what happens when the store adds a product line.",
      learnerActions: "React, suggest problems with the approach.",
      materials: "Slide 3 of the Week 4 deck",
    },
    {
      name: "Objectives & pre-test",
      minutes: 7,
      frameworkStage: "Objectives + Pre-test",
      teacherActions: "State the objectives; run a two-question poll on loop syntax from the pre-reading.",
      learnerActions: "Answer the poll individually; note their own confidence.",
      materials: "Poll (Vevox or show of hands)",
    },
    {
      name: "Paired loop tracing",
      minutes: 20,
      frameworkStage: "Participatory learning",
      teacherActions: "Demonstrate one trace, then circulate as pairs trace three loops of increasing difficulty over the transactions list.",
      learnerActions: "In pairs: one predicts each iteration aloud, the other checks in the debugger; swap halfway.",
      materials: "Worksheet §2, laptops with the starter notebook",
    },
    {
      name: "Accumulator pattern mini-lecture",
      minutes: 8,
      frameworkStage: "Participatory learning",
      teacherActions: "Name the pattern the pairs just discovered; show total = 0 initialisation and the classic reset-inside-the-loop bug.",
      learnerActions: "Annotate their traced examples with the pattern.",
      materials: "Whiteboard",
    },
    {
      name: "Post-test & summary",
      minutes: 10,
      frameworkStage: "Post-test + Summary",
      teacherActions: "Re-run the poll plus one write-a-loop exercise mirroring objective 3; preview how loops feed next week's functions.",
      learnerActions: "Complete the exercise solo; compare with the pre-test.",
      materials: "Exit ticket",
    },
  ],
  formativeChecks: [
    {
      question: "What is the value of total after the second iteration?",
      anticipatedMisconceptions: "Students often report the value after the first iteration — watch for off-by-one tracing.",
    },
    {
      question: "Why must total = 0 sit before the loop, not inside it?",
      anticipatedMisconceptions: "Many will say 'it just does' — probe for the reset-each-iteration consequence.",
    },
  ],
  differentiation: [
    "Worksheet loops are tiered: the third trace is optional extension using a nested structure.",
    "Starter notebook offers the same data as a table image for students who reason better visually.",
    "Pairs are teacher-assigned to mix confidence levels revealed by the pre-test.",
  ],
  aiUseStatement:
    "You may use GenAI tools to explain loop errors you encounter, but the traced predictions on the worksheet must be your own; acknowledge any AI help in the margin.",
  materialsChecklist: [
    "Starter notebook pushed to the unit GitHub",
    "Worksheet §2 printed (one per pair)",
    "Poll questions loaded",
    "Exit tickets",
  ],
  homework:
    "Finish the notebook's 'monthly totals' loop and bring one question about it — next week we wrap that loop in a function.",
  assumptions: [
    "Assumed all students bring laptops (class ran BYOD in weeks 1-3).",
    "Assumed the room allows pair seating.",
    "Assumed ~28 students as stated; poll tool scales either way.",
  ],
};

const demoSettings = {
  provider: "anthropic",
  appPassword: "",
  configs: {
    anthropic: { apiKey: "demo", model: "claude-opus-4-8", baseUrl: "" },
    openai: { apiKey: "", model: "", baseUrl: "https://api.openai.com/v1" },
    openrouter: { apiKey: "", model: "", baseUrl: "https://openrouter.ai/api/v1" },
    ollama: { apiKey: "", model: "", baseUrl: "http://localhost:11434/v1" },
    custom: { apiKey: "", model: "", baseUrl: "" },
  },
};

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve(undefined);
      } catch {
        /* not up yet */
      }
      if (Date.now() - start > timeoutMs) return reject(new Error("dev server timeout"));
      setTimeout(tick, 400);
    };
    tick();
  });
}

const dev = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
  cwd: ROOT,
  stdio: "ignore",
  detached: false,
});

try {
  await waitForServer(`http://localhost:${PORT}/app/`);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  await ctx.addInitScript(
    ([plans, settings]) => {
      localStorage.setItem("lessonloom.plans", JSON.stringify(plans));
      localStorage.setItem("lessonloom.settings", JSON.stringify(settings));
    },
    [[demoPlan], demoSettings],
  );
  const page = await ctx.newPage();
  const base = `http://localhost:${PORT}/app/`;

  // 1. Plan view (hero shot)
  await page.goto(`${base}#/plan/demo-plan-1`);
  await page.waitForSelector(".segment");
  await page.screenshot({ path: `${SHOTS}/plan.png` });

  // 2. Dashboard
  await page.goto(`${base}#/`);
  await page.waitForSelector(".plan-card");
  await page.screenshot({ path: `${SHOTS}/dashboard.png` });

  // 3. Wizard — material step
  await page.goto(`${base}#/new`);
  await page.waitForSelector(".dropzone");
  await page.screenshot({ path: `${SHOTS}/wizard.png` });

  // 4. Wizard — framework step (walk through the steps)
  await page.fill(
    'input[placeholder^="Name this material"]',
    "Week 4 lecture notes — loops",
  );
  await page.fill(
    "textarea",
    "Loops in Python: for-loops over lists, the accumulator pattern, and common errors. Example: totalling a list of daily sales figures...",
  );
  await page.click('text=Use this text');
  await page.click('text=Next: context →');
  await page.click('text=Next: framework →');
  await page.waitForSelector(".fw-card");
  await page.click(".fw-card:nth-child(2)");
  await page.screenshot({ path: `${SHOTS}/framework.png` });

  // 5. App icon source
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.goto(`http://localhost:${PORT}/scripts/icon.html`);
  await page.screenshot({
    path: path.join(ROOT, "src-tauri", "icon-source.png"),
    clip: { x: 0, y: 0, width: 1024, height: 1024 },
    omitBackground: true,
  });

  await browser.close();
  console.log("Captured: plan, dashboard, wizard, framework + icon source");
} finally {
  dev.kill("SIGTERM");
}
