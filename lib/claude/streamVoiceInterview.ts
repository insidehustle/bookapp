import type { VoiceInterviewMessage } from "@prisma/client";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";

const SYSTEM_PROMPT = `You are an experienced writing coach conducting a short interview with an author to capture their writing voice, so it can be reused consistently across their books.

Ask ONE or TWO focused questions at a time - never a long list of questions in one message. Over the course of the conversation, work through:
- Tone (emotional register - wry, earnest, hard-boiled, etc.)
- Vocabulary and register (word choice, how plain or ornate)
- Sentence structure and rhythm (short and punchy vs. long and flowing)
- Pacing
- Narrative personality/perspective
- Humor - level and style, or none
- Formality
- Cultural nuances or specific influences
- Signature quirks or stylistic tics to include
- Anything to actively avoid (forbidden words, phrases, or patterns)

Keep your questions warm, specific, and grounded in what the author has already told you. When their answer suggests a natural follow-up, ask it before moving to a new topic.`;

/**
 * Returns the awaited async-iterable stream directly (Gemini's
 * generateContentStream resolves to an AsyncGenerator) - callers `for await`
 * the result.
 */
export async function streamVoiceInterviewTurn(params: {
  voiceName: string;
  voiceDescription: string | null;
  history: VoiceInterviewMessage[];
}) {
  const contextParts = [
    `Voice name: ${params.voiceName}`,
    params.voiceDescription ? `Description: ${params.voiceDescription}` : "",
  ].filter(Boolean);

  return gemini.models.generateContentStream({
    model: selectModel("INTERVIEW"),
    contents: params.history.map((message) => ({
      role: message.role === "USER" ? "user" : "model",
      parts: [{ text: message.content }],
    })),
    config: {
      systemInstruction: `${SYSTEM_PROMPT}\n\n${contextParts.join("\n\n")}`,
      maxOutputTokens: 3000,
    },
  });
}
