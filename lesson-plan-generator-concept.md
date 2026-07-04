# Lesson Loom: AI-Assisted Lesson Plan Generator

*Concept description, v0.2, July 2026*

## One-line summary

Upload any piece of teaching material (a course outline, a single lecture, a worksheet), choose your audience and pedagogical framework, and generate a structured, editable lesson plan that you can refine with AI and link into a growing course dashboard.

## Problem statement

Educators across sectors (K-12, university, VET, executive education) spend significant time converting raw material into structured lesson plans. Existing tools either generate generic plans with no pedagogical grounding, or require the educator to start from a blank page. There is no tool that:

1. Starts from the educator's *actual* material rather than a topic prompt
2. Applies a recognised instructional design framework of the educator's choosing
3. Understands where a lesson sits in a sequence (what came before, what comes next)
4. Accumulates into a coherent course map over time rather than producing one-off artefacts
5. Treats AI as a refinement partner in the design loop, not a one-shot generator

## Core workflow

```
Upload material → Set context → Choose framework → Generate → Refine with AI → Save to dashboard → Link to other lessons
```

### 1. Input layer

Accepted material types:

- **Course outline / unit outline**: generates a lesson plan *series* (one per week or topic), or lets the user pick a single week to develop
- **Single lecture**: slides (pptx, pdf), notes (docx, md), or a recording transcript
- **Single worksheet or activity sheet**: reverse-engineers the plan around the activity
- **Reading / article / case study**: builds a plan that uses the material as the anchor text
- **URL or LMS export** (stretch goal)

The system should classify the material type automatically and confirm with the user ("This looks like a 12-week unit outline. Generate a series, or focus on one week?").

### 2. Context and audience settings

- **Sector**: K-12 (with year level), undergraduate, postgraduate, VET, executive education, corporate training
- **Duration**: 30 min, 50 min, 2 hr workshop, half day, full day
- **Class size and delivery mode**: face-to-face, online synchronous, hybrid, self-paced
- **Learner profile notes**: free text (e.g. "mid-career managers, low technical background", "mixed-ability year 9 class")
- **Learning objectives**: paste existing objectives, or let the tool draft them from the material for approval before generation (objectives-first is better instructional design and keeps the human in the loop)

### 3. Sequence context (the "self-report" feature)

When only a single piece of material is uploaded, the tool has no sense of the arc. A short optional panel lets the user say:

- **Previously covered**: bullet points or an upload of last week's material
- **Coming next**: what the following session will do
- **Assumed prior knowledge**: prerequisites learners should already have
- **Assessment context**: what assessment this lesson feeds into

This lets generated plans include genuine recap hooks, foreshadowing, and scaffolding rather than generic openers. If the lesson is later linked to others on the dashboard (see below), this panel pre-fills automatically from the linked plans.

### 4. Framework / style selector

A curated library of instructional design frameworks, each implemented as a structural template plus generation guidance:

| Framework | Best suited to | Structure it imposes |
|---|---|---|
| Gagné's Nine Events of Instruction | University, structured skills teaching | Gain attention → objectives → recall → present → guide → practice → feedback → assess → transfer |
| 5E Model (BSCS) | K-12 science, inquiry learning | Engage, Explore, Explain, Elaborate, Evaluate |
| BOPPPS | University lectures, tutorials | Bridge-in, Objectives, Pre-test, Participatory learning, Post-test, Summary |
| Understanding by Design (backward design) | Unit-level planning | Desired results → evidence → learning activities |
| Merrill's First Principles | Problem-centred, professional education | Problem, activation, demonstration, application, integration |
| Kolb's Experiential Cycle | Executive education, workshops | Concrete experience → reflection → conceptualisation → experimentation |
| Case method | Executive education, business schools | Pre-work, cold open, discussion pastures, board plan, takeaways |
| Gradual release (I do, we do, you do) | K-12, skills-based | Modelled, guided, independent practice |
| Flipped classroom | University, hybrid delivery | Pre-class, in-class active learning, post-class consolidation |
| Problem/project-based learning | Capstones, applied units | Driving question, milestones, artefact, reflection |

Each framework page should include a one-paragraph plain-language explanation and a "when to use this" note, so the tool doubles as light professional development.

#### Framework guidance engine

For users who do not already know which framework they want, the tool offers guided selection through a single recommendation engine with two input channels:

**Channel 1: material-based recommendation.** The tool infers the teaching situation from the uploaded artefact plus context settings, and suggests a framework. Signals include material type (a case study with discussion questions points at case method, a skills worksheet at gradual release, a full unit outline at backward design), sector, duration, and delivery mode.

**Channel 2: situational triage ("help me choose").** A short, skippable quiz of four or five questions about the *teaching situation*, not the educator's personal style. Deliberately avoid anything resembling learning-styles profiling; frameworks are matched to situations, not personalities. Candidate questions:

- Is this a one-off session or part of a sequence?
- Is the primary goal knowledge, skill, or judgement?
- How much prior knowledge do learners bring?
- How interactive can the room realistically be?
- Is there pre-work or pre-reading?

These answers genuinely discriminate between frameworks: inquiry with novices leans 5E, judgement-building with experienced professionals leans case method or Kolb, procedural skill leans gradual release or Gagné.

**Design rules for both channels:**

- Every recommendation comes with a *because*: a one-or-two sentence rationale tied to the material and answers, plus a named runner-up ("BOPPPS, because this is a 50-minute lecture with defined pre-reading and BOPPPS gives you a pre-test hook for it. Merrill would also work if you want it more problem-centred."). Recommendations without reasons are magic buttons, and magic buttons train delegation rather than conversation.
- When the two channels disagree, surface the tension rather than hiding it ("your material suggests X, your answers suggest Y") and explain the trade-off. Disagreement moments are the most pedagogically valuable ones.
- The recommendation is always advisory. Pre-selection and manual override are first-class paths, and the quiz is skippable, surfaced only on first use or when the user hesitates at the framework step. An educator who wants Gagné every week should never see it again.

### 5. Generation output

A generated lesson plan includes:

- Title, audience, duration, delivery mode
- Learning objectives (Bloom-aligned verbs, tagged by cognitive level)
- Timed activity breakdown with minute allocations that sum to the session length
- For each segment: what the teacher does, what learners do, materials needed, and framework stage it fulfils
- Formative checks and questions to ask (with anticipated misconceptions)
- Differentiation and UDL notes (multiple means of engagement, representation, action/expression)
- A student-facing GenAI use statement for the lesson (see AI policy layer below)
- Materials and preparation checklist
- Homework / bridge to next session (informed by the sequence context)
- Optional companion artefacts: worksheet draft, slide outline, exit ticket, marking rubric

### 6. AI refinement loop

Generation is the start of the conversation, not the end:

- **Section-level regeneration**: regenerate just the warm-up, just the assessment, etc., without disturbing the rest
- **Conversational edits**: "make the middle activity group-based", "cut this to 40 minutes", "lower the reading level", "add a role-play"
- **Variant generation**: produce an online-delivery variant or a differentiated version for advanced/support learners side by side
- **Assumption surfacing**: the AI lists the assumptions it made (class size, tech available, prior knowledge) so the user can correct them, which is both better output and models good AI practice
- **Self-critique pass**: an optional "review this plan" step where the AI checks constructive alignment (objectives ↔ activities ↔ assessment), timing realism, and cognitive load, and reports issues rather than silently fixing them

### 7. Dashboard and lesson linking ("build as you go")

- Every saved plan lives on a dashboard, organised by course/unit
- Plans can be **linked in sequence** (Week 3 → Week 4), which automatically populates recap and foreshadow sections and flags gaps or overlaps ("Objective X is introduced in Week 5 but assessed in Week 4")
- A **course map view** shows objectives coverage across the sequence, Bloom-level distribution, and assessment touchpoints, effectively growing a curriculum map from the bottom up
- Plans can be duplicated as templates ("clone my Week 1 structure for the new unit")
- Tagging: by topic, framework, sector, so a bank of reusable activities accumulates over time

## Additional feature suggestions

**AI-use policy layer.** Let the educator set a GenAI stance per lesson or per activity (e.g. a traffic light: not permitted / permitted with acknowledgement / actively required), and have the generated plan include matching student-facing guidance and activity design. This distinguishes the tool from generic generators and aligns with strategic-use rather than delegation framings of AI in education.

**Constructive alignment checker.** Beyond generation, a standing audit that maps every activity and assessment back to an objective. Anything orphaned gets flagged. This is the feature that makes the tool credible with learning designers.

**Accessibility and UDL audit.** A built-in check against UDL guidelines on every plan (an obvious integration point with an existing UDL audit tool if you have one).

**Standards and accreditation mapping.** Optional mapping of objectives to external frameworks: Australian Curriculum codes for K-12, AQF level descriptors for university, professional body criteria (e.g. ACS) where relevant. Big differentiator for institutional adoption.

**Timing engine.** Explicit minute budgets with a visual timeline, plus a "compression mode" that intelligently trims a 60-minute plan to 45 rather than scaling everything linearly.

**Export options.** Markdown (canonical format), PDF handout, slide outline, and eventually LMS-ready packages (Common Cartridge / Canvas). Print-friendly one-page "teacher card" version for use in the room.

**Version history.** Every refinement creates a version; educators can compare "as planned" vs "as revised after teaching" and add post-delivery reflection notes, turning the dashboard into a reflective practice record.

**Privacy-first / local model option.** Allow the inference backend to be a local model for institutions with data sovereignty concerns about uploading student-facing or unpublished material to external APIs. Cloud model as default, local as a configuration option.

**Collaboration and sharing.** Share a plan read-only with a colleague, or publish a de-identified template to a community library. Team teaching mode where two educators co-edit.

**Activity bank.** Every activity generated (icebreakers, think-pair-shares, case discussions) is saved as a reusable atom that can be dragged into future plans.

**Reverse mode.** Upload an existing lesson plan and have the tool critique it against a chosen framework, rather than generating from scratch. Low-cost feature, high value for professional development contexts.

## MVP scoping suggestion

Phase 1 (prove the core loop):
1. Upload single material (pdf/docx/md) + context settings
2. Three frameworks: Gagné, BOPPPS, 5E
3. Generate a full plan with timed segments and objectives
4. Conversational refinement
5. Save to a simple dashboard, markdown export

Phase 2: sequence context, lesson linking, course map view, variants, UDL check, material-based framework recommendation (with rationale)

Phase 3: situational triage quiz and combined-channel recommendations, standards mapping, LMS export, collaboration, local model backend, activity bank

## Open design questions

- Should objectives be approved by the user *before* full generation (better pedagogy, more friction) or generated inline (faster, riskier)?
- One plan per material, or allow multiple plans from the same material for different audiences?
- How much structure is framework-enforced vs freely editable after generation?
- Web app vs desktop/local-first? Local-first suits the privacy angle but complicates the dashboard/sharing story.
