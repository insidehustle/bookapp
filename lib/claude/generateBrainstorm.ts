import { z } from "zod";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { BrainstormSchema, type Brainstorm } from "@/lib/claude/schemas";
import { ClaudeRefusalError, ClaudeTruncatedError, classifyStopReason } from "@/lib/claude/errors";

const SYSTEM_PREAMBLE =
  "You are a creative brainstorming partner for a fiction author. Given a short prompt, generate a varied, specific, non-generic list of suggestions - avoid repeating the same idea with minor wording changes.";

export async function generateBrainstorm(params: {
  prompt: string;
  projectTitle: string;
  genre: string | null;
}): Promise<Brainstorm> {
  const context = [
    `Book title: ${params.projectTitle}`,
    params.genre ? `Genre: ${params.genre}` : "",
    `Request: ${params.prompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await gemini.models.generateContent({
    model: selectModel("BRAINSTORM"),
    contents: [{ role: "user", parts: [{ text: context }] }],
    config: {
      systemInstruction: SYSTEM_PREAMBLE,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(BrainstormSchema),
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

  const parsed = BrainstormSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ClaudeTruncatedError();
  }

  return parsed.data;
}
