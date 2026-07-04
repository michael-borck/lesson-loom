export interface Settings {
  apiKey: string;
  model: string;
}

export interface ContextSettings {
  sector: string;
  yearLevel: string;
  duration: string;
  classSize: string;
  deliveryMode: string;
  learnerProfile: string;
  existingObjectives: string;
  previouslyCovered: string;
  comingNext: string;
  priorKnowledge: string;
  assessmentContext: string;
  aiPolicy: string;
}

export interface Objective {
  text: string;
  bloomLevel: string;
}

export interface Segment {
  name: string;
  minutes: number;
  frameworkStage: string;
  teacherActions: string;
  learnerActions: string;
  materials: string;
}

export interface FormativeCheck {
  question: string;
  anticipatedMisconceptions: string;
}

export interface GeneratedPlan {
  title: string;
  summary: string;
  objectives: Objective[];
  segments: Segment[];
  formativeChecks: FormativeCheck[];
  differentiation: string[];
  aiUseStatement: string;
  materialsChecklist: string[];
  homework: string;
  assumptions: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface LessonPlan extends GeneratedPlan {
  id: string;
  course: string;
  frameworkId: string;
  context: ContextSettings;
  materialName: string;
  createdAt: string;
  updatedAt: string;
  chat: ChatMessage[];
}

export type MaterialInput =
  | { kind: "text"; name: string; text: string }
  | { kind: "pdf"; name: string; base64: string };
