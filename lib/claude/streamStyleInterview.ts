import type { PlanningDocument, StyleInterviewMessage } from "@prisma/client";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { renderPlanningDocsBlock } from "@/lib/claude/promptBuilder";

const SYSTEM_PROMPT = `You are an experienced developmental editor conducting a short pre-rewrite intake interview with an author about their book.

Ask ONE or TWO focused questions at a time - never a long list of questions in one message. Over the course of the conversation, work through:
- Tone (e.g. literary vs. commercial, dark vs. light, serious vs. playful)
- Pacing and cadence (sentence rhythm, scene length, how fast the story should move)
- Voice and point of view preferences
- What the author wants to preserve from their existing draft vs. what they want changed or improved
- Comparable authors or titles that capture the feel they're going for
- Any content boundaries or sensitivities to handle carefully

Keep your questions warm, specific, and grounded in what you already know about this project. When the author's answer suggests a natural follow-up, ask it before moving to a new topic.`;

/**
 * Returns the awaited async-iterable stream directly (Gemini's
 * generateContentStream resolves to an AsyncGenerator, unlike Anthropic's
 * synchronous event-emitter MessageStream) - callers `for await` the result.
 */
export async function streamStyleInterviewTurn(params: {
  projectTitle: string;
  premise: string | null;
  genre: string | null;
  planningDocs: PlanningDocument[];
  manuscriptExcerpt: string | null;
  history: StyleInterviewMessage[];
}) {
  const contextParts = [
    `Book title: ${params.projectTitle}`,
    params.genre ? `Genre: ${params.genre}` : "",
    params.premise ? `Premise: ${params.premise}` : "",
    params.planningDocs.length > 0 ? renderPlanningDocsBlock(params.planningDocs) : "",
    params.manuscriptExcerpt
      ? `Excerpt from the uploaded manuscript:\n${params.manuscriptExcerpt}`
      : "",
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
