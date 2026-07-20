import type { Chapter, PlanningDocument } from "@prisma/client";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { renderManuscriptSoFarBlock, renderPlanningDocsBlock } from "@/lib/claude/promptBuilder";

const SYSTEM_PROMPT = `You are a skilled ghostwriter drafting a chapter for an author's novel. Match the established plot, characters, voice, and style described in the planning docs below. Continue naturally from any prior chapters - keep names, established facts, and tone consistent. Write prose only - no headings, no chapter title, no meta-commentary, no notes to the author.`;

/**
 * Returns the awaited async-iterable stream directly (Gemini's
 * generateContentStream resolves to an AsyncGenerator) - callers `for await`
 * the result.
 */
export async function streamChapterDraft(params: {
  projectTitle: string;
  premise: string | null;
  genre: string | null;
  planningDocs: PlanningDocument[];
  priorChapters: Chapter[];
  chapterOrder: number;
  chapterTitle: string;
  instruction: string | null;
  referenceFilesText?: string | null;
  targetWordCount?: number | null;
  voice?: { name: string; content: string } | null;
}) {
  const contextParts = [
    `Book title: ${params.projectTitle}`,
    params.genre ? `Genre: ${params.genre}` : "",
    params.premise ? `Premise: ${params.premise}` : "",
    params.voice
      ? `--- Author's Voice (HIGHEST PRIORITY - this overrides any conflicting tone/style guidance elsewhere in this prompt, including the Style Brief below if present) ---\n${params.voice.content}`
      : "",
    params.planningDocs.length > 0 ? renderPlanningDocsBlock(params.planningDocs) : "",
    params.priorChapters.length > 0
      ? `--- Manuscript so far ---\n${renderManuscriptSoFarBlock(params.priorChapters)}`
      : "",
    params.referenceFilesText
      ? `--- Reference documents (for context/facts only - do not copy verbatim) ---\n${params.referenceFilesText}`
      : "",
  ].filter(Boolean);

  const instruction = [
    `Write chapter ${params.chapterOrder}${params.chapterTitle ? `: ${params.chapterTitle}` : ""}.`,
    params.instruction ?? "",
    params.targetWordCount
      ? `Aim for approximately ${params.targetWordCount.toLocaleString()} words for this chapter - this length matters, so do not wrap up or stop early just because the scene feels resolved. Develop the scene(s) fully with detail, dialogue, and interiority to reach that length.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return gemini.models.generateContentStream({
    model: selectModel("DRAFT"),
    contents: [{ role: "user", parts: [{ text: instruction }] }],
    config: {
      systemInstruction: `${SYSTEM_PROMPT}\n\n${contextParts.join("\n\n")}`,
      maxOutputTokens: 12000,
    },
  });
}
