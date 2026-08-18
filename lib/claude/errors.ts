export type ClaudeOutcome =
  | { type: "ok"; title?: string }
  | { type: "refusal"; category: string | null }
  | { type: "truncated" }
  | { type: "rate_limited" }
  | { type: "missing_api_key" }
  | { type: "invalid_api_key" }
  | { type: "server_error" };

/**
 * Loosely typed on purpose (this file is imported by client components too,
 * so it must not import the @google/genai SDK itself) - the Gemini SDK
 * throws ApiError with a plain `status` HTTP status code, and 429 means the
 * request was rejected for rate limiting or quota exhaustion, as opposed to
 * a bad key (401/403) or a server-side hiccup (5xx).
 */
export function isRateLimitError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 429
  );
}

/**
 * A Gemini API key that's missing, revoked, or lacks permission comes back
 * as a 401/403 - distinct from 429 (rate limit) and worth its own friendly
 * message pointing the user at Settings instead of "try again later".
 */
export function isAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    ((error as { status?: unknown }).status === 401 ||
      (error as { status?: unknown }).status === 403)
  );
}

/**
 * Thrown when a user hasn't saved a Gemini API key yet - every AI call
 * requires one (there is no shared/fallback server key).
 */
export class MissingApiKeyError extends Error {
  constructor() {
    super("Add your Gemini API key in Settings before using AI features.");
  }
}

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

/**
 * Shared catch-all for non-streaming API routes. Maps our known error types
 * (including a Gemini rate-limit/quota rejection) to a friendly message;
 * anything else (a raw Gemini SDK error - bad API key, network failure,
 * etc.) is logged server-side and turned into a generic, still-valid-JSON
 * response instead of crashing the route and leaving the client trying to
 * parse an empty/HTML error body.
 */
export function toApiErrorResponse(error: unknown): { message: string; status: number } {
  if (error instanceof MissingApiKeyError) {
    return { message: error.message, status: 400 };
  }
  if (isRateLimitError(error)) {
    return {
      message:
        "The AI has hit its usage limit for now (rate limit or quota exceeded). Please wait a bit and try again.",
      status: 429,
    };
  }
  if (isAuthError(error)) {
    return {
      message: "Your Gemini API key appears to be invalid or lacks permission. Check it in Settings.",
      status: 401,
    };
  }
  if (error instanceof ClaudeRefusalError || error instanceof ClaudeTruncatedError) {
    return { message: error.message, status: 422 };
  }
  console.error("AI request failed:", error);
  return {
    message: "The AI request failed unexpectedly. Please try again - check the server logs for details.",
    status: 502,
  };
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

/**
 * Shared client-side copy for a non-"ok" stream outcome, so every streaming
 * panel (chat, chapter draft/rewrite, style/voice interview) shows the same
 * wording instead of each reinventing it.
 */
export function describeStreamOutcome(outcome: ClaudeOutcome): string {
  switch (outcome.type) {
    case "refusal":
      return "The model declined to respond to that.";
    case "truncated":
      return "The response was cut off — try again or with a shorter message.";
    case "rate_limited":
      return "The AI has hit its usage limit for now. Please wait a bit and try again.";
    case "missing_api_key":
      return "Add your Gemini API key in Settings before using AI features.";
    case "invalid_api_key":
      return "Your Gemini API key appears to be invalid or lacks permission. Check it in Settings.";
    case "server_error":
      return "The AI request failed unexpectedly. Please try again.";
    case "ok":
      return "";
  }
}
