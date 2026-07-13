import type { ChatMessage, PlanningDocument } from "@prisma/client";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { renderPlanningDocsBlock } from "@/lib/claude/promptBuilder";

const SYSTEM_PROMPT = `You are a helpful, conversational writing assistant embedded in an author's book project. Answer questions, brainstorm out loud, discuss craft, and help the author think through problems with their manuscript.

This is an open-ended chat, not a structured interview - follow the author's lead rather than working through a checklist. Be direct and specific rather than generic; ground your answers in the project's actual planning docs and manuscript content when it's relevant.`;

/**
 * Returns the awaited async-iterable stream directly (Gemini's
 * generateContentStream resolves to an AsyncGenerator, unlike Anthropic's
 * synchronous event-emitter MessageStream) - callers `for await` the result.
 */
export async function streamChatTurn(params: {
  projectTitle: string;
  premise: string | null;
  genre: string | null;
  planningDocs: PlanningDocument[];
  manuscriptExcerpt: string | null;
  history: ChatMessage[];
}) {
  const contextParts = [
    `Book title: ${params.projectTitle}`,
    params.genre ? `Genre: ${params.genre}` : "",
    params.premise ? `Premise: ${params.premise}` : "",
    params.planningDocs.length > 0 ? renderPlanningDocsBlock(params.planningDocs) : "",
    params.manuscriptExcerpt
      ? `Excerpt from the manuscript:\n${params.manuscriptExcerpt}`
      : "",
  ].filter(Boolean);

  return gemini.models.generateContentStream({
    model: selectModel("CHAT"),
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
