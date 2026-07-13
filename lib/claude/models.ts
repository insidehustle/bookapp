// gemini-2.5-flash for everything - cheap and confirmed still active (unlike
// gemini-2.0-flash, which was retired June 2026). Swap POLISH to a Pro-tier
// model later if manuscript-wide passes need more quality than Flash gives.
export const MODELS = {
  DRAFT: "gemini-2.5-flash",
  REWRITE: "gemini-2.5-flash",
  INTERVIEW: "gemini-2.5-flash",
  CHAT: "gemini-2.5-flash",
  SELECTION_REVISE: "gemini-2.5-flash",
  FEEDBACK: "gemini-2.5-flash",
  BRAINSTORM: "gemini-2.5-flash",
  POLISH: "gemini-2.5-flash",
} as const;

export type ClaudeTask = keyof typeof MODELS;

export function selectModel(task: ClaudeTask, override?: string): string {
  return override ?? MODELS[task];
}
