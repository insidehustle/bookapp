import { z } from "zod";
import type { GoogleGenAI } from "@google/genai";
import { selectModel } from "@/lib/claude/models";
import { ChapterTitleSchema } from "@/lib/claude/schemas";
import { ClaudeRefusalError, ClaudeTruncatedError, classifyStopReason } from "@/lib/claude/errors";

const SYSTEM_PREAMBLE =
  "You title fiction chapters. Given a chapter's text, produce one short, evocative title (2-6 words) that captures its content without spoiling later chapters. Do not include the word 'Chapter' or a number - just the title itself.";

export async function generateChapterTitle(client: GoogleGenAI, params: {
  projectTitle: string;
  genre: string | null;
  chapterOrder: number;
  content: string;
}): Promise<string> {
  const context = [
    `Book title: ${params.projectTitle}`,
    params.genre ? `Genre: ${params.genre}` : "",
    `This is chapter ${params.chapterOrder}. Its text:`,
    params.content.slice(0, 4000),
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.models.generateContent({
    model: selectModel("CHAPTER_TITLE"),
    contents: [{ role: "user", parts: [{ text: context }] }],
    config: {
      systemInstruction: SYSTEM_PREAMBLE,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(ChapterTitleSchema),
    },
  });

  const outcome = classifyStopReason(response);
  if (outcome.type === "refusal") {
    throw new ClaudeRefusalError(outcome.category);
  }

  const text = response.text;
  if (outcome.type === "truncated" || !text) {
    throw new ClaudeTruncatedError();
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new ClaudeTruncatedError();
  }

  const parsed = ChapterTitleSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ClaudeTruncatedError();
  }

  return parsed.data.title.trim();
}
