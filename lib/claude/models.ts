// gemini-3.6-flash for everything - gemini-2.5-flash (previously used here)
// started rejecting brand-new API keys with a 404 "no longer available to
// new users" well before its official Oct 2026 shutdown date, a known Gemini
// API inconsistency. gemini-3.6-flash is the current flash-tier stable
// model. Swap POLISH to a Pro-tier model later if manuscript-wide passes
// need more quality than Flash gives.
export const MODELS = {
  DRAFT: "gemini-3.6-flash",
  REWRITE: "gemini-3.6-flash",
  INTERVIEW: "gemini-3.6-flash",
  CHAT: "gemini-3.6-flash",
  SELECTION_REVISE: "gemini-3.6-flash",
  FEEDBACK: "gemini-3.6-flash",
  BRAINSTORM: "gemini-3.6-flash",
  POLISH: "gemini-3.6-flash",
  CHAPTER_TITLE: "gemini-3.6-flash",
} as const;

export type ClaudeTask = keyof typeof MODELS;

export function selectModel(task: ClaudeTask, override?: string): string {
  return override ?? MODELS[task];
}
