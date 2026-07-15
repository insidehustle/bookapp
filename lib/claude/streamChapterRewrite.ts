import type { Chapter, PlanningDocument } from "@prisma/client";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { renderManuscriptSoFarBlock, renderPlanningDocsBlock } from "@/lib/claude/promptBuilder";

const SYSTEM_PROMPT = `You are a skilled developmental editor rewriting a chapter of an author's novel per their instruction. Preserve the plot events and character facts established elsewhere in the manuscript unless the instruction specifically asks you to change them. Return the full rewritten chapter as prose only - no headings, no chapter title, no meta-commentary, no notes to the author.`;

/**
 * Returns the awaited async-iterable stream directly (Gemini's
 * generateContentStream resolves to an AsyncGenerator) - callers `for await`
 * the result.
 */
export async function streamChapterRewrite(params: {
  projectTitle: string;
  premise: string | null;
  genre: string | null;
  planningDocs: PlanningDocument[];
  otherChapters: Chapter[];
  chapterOrder: number;
  chapterTitle: string;
  currentContent: string;
  instruction: string;
  referenceFilesText?: string | null;
}) {
  const contextParts = [
    `Book title: ${params.projectTitle}`,
    params.genre ? `Genre: ${params.genre}` : "",
    params.premise ? `Premise: ${params.premise}` : "",
    params.planningDocs.length > 0 ? renderPlanningDocsBlock(params.planningDocs) : "",
    params.otherChapters.length > 0
      ? `--- Rest of the manuscript (for context/continuity only) ---\n${renderManuscriptSoFarBlock(params.otherChapters)}`
      : "",
    params.referenceFilesText
      ? `--- Reference documents (for context/facts only - do not copy verbatim) ---\n${params.referenceFilesText}`
      : "",
  ].filter(Boolean);

  const userText = [
    `Chapter ${params.chapterOrder}${params.chapterTitle ? `: ${params.chapterTitle}` : ""} - current text:`,
    params.currentContent,
    "",
    `Instruction: ${params.instruction}`,
  ].join("\n");

  return gemini.models.generateContentStream({
    model: selectModel("REWRITE"),
    contents: [{ role: "user", parts: [{ text: userText }] }],
    config: {
      systemInstruction: `${SYSTEM_PROMPT}\n\n${contextParts.join("\n\n")}`,
      maxOutputTokens: 8000,
    },
  });
}
