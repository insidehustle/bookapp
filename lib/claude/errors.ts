export type ClaudeOutcome =
  | { type: "ok" }
  | { type: "refusal"; category: string | null }
  | { type: "truncated" };

// Gemini finish reasons that mean the model declined/was blocked, as
// opposed to a clean stop or hitting the output cap.
const REFUSAL_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "LANGUAGE",
  "IMAGE_SAFETY",
]);

/**
 * Loosely typed on purpose - accepts anything shaped like a Gemini
 * GenerateContentResponse (candidates[0].finishReason) without depending on
 * an exact SDK type, so it works on both the final non-streaming response
 * and the last chunk of a stream.
 */
export function classifyStopReason(response: {
  candidates?: Array<{ finishReason?: string | null }> | null;
}): ClaudeOutcome {
  const finishReason = response.candidates?.[0]?.finishReason ?? null;
  if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
    return { type: "refusal", category: finishReason };
  }
  if (finishReason === "MAX_TOKENS") {
    return { type: "truncated" };
  }
  return { type: "ok" };
}

export class ClaudeRefusalError extends Error {
  category: string | null;
  constructor(category: string | null) {
    super("The model declined to generate this" + (category ? " (" + category + ")" : "") + ".");
    this.category = category;
  }
}

export class ClaudeTruncatedError extends Error {
  constructor() {
    super("The model's response was truncated (max output tokens reached).");
  }
}

// Streaming trailer: shared framing so every streaming route can signal a
// non-"ok" outcome (refusal/truncation) after the text stream closes,
// without a separate SSE event system. This token is vanishingly unlikely
// to appear in generated prose, making it a safe delimiter from visible text.
const TRAILER_PREFIX = "\n<<<CLAUDE_STREAM_OUTCOME>>>";

export function encodeStreamTrailer(outcome: ClaudeOutcome): string {
  return TRAILER_PREFIX + JSON.stringify(outcome);
}

export function extractStreamTrailer(fullText: string): {
  text: string;
  outcome: ClaudeOutcome | null;
} {
  const idx = fullText.indexOf(TRAILER_PREFIX);
  if (idx === -1) return { text: fullText, outcome: null };
  const text = fullText.slice(0, idx);
  const raw = fullText.slice(idx + TRAILER_PREFIX.length);
  try {
    return { text: text, outcome: JSON.parse(raw) as ClaudeOutcome };
  } catch {
    return { text: text, outcome: null };
  }
}
