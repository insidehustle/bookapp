import { z } from "zod";
import type { PlanningDocument } from "@prisma/client";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { FeedbackSchema, type Feedback } from "@/lib/claude/schemas";
import { renderPlanningDocsBlock } from "@/lib/claude/promptBuilder";
import { ClaudeRefusalError, ClaudeTruncatedError, classifyStopReason } from "@/lib/claude/errors";

const SYSTEM_PREAMBLE =
  "You are an experienced developmental editor giving an author honest, actionable feedback on their manuscript. Do not rewrite or suggest exact replacement prose - describe what's working, what isn't, and why, so the author can revise it themselves.";

// Generous but bounded safety net - the 1M-token context window handles a
// full manuscript easily; this just guards against a pathologically large input.
const MAX_MANUSCRIPT_CHARS = 400_000;

export async function generateFeedback(params: {
  projectTitle: string;
  premise: string | null;
  genre: string | null;
  planningDocs: PlanningDocument[];
  manuscriptText: string;
}): Promise<Feedback> {
  const contextParts = [
    `Book title: ${params.projectTitle}`,
    params.genre ? `Genre: ${params.genre}` : "",
    params.premise ? `Premise: ${params.premise}` : "",
    params.planningDocs.length > 0 ? renderPlanningDocsBlock(params.planningDocs) : "",
    `--- Manuscript ---\n${params.manuscriptText.slice(0, MAX_MANUSCRIPT_CHARS)}`,
  ].filter(Boolean);

  const response = await gemini.models.generateContent({
    model: selectModel("FEEDBACK"),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${contextParts.join("\n\n")}\n\nGive feedback on this manuscript as it stands.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PREAMBLE,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(FeedbackSchema),
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

  const parsed = FeedbackSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ClaudeTruncatedError();
  }

  return parsed.data;
}
