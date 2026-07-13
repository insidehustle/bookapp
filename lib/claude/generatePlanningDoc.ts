import { z } from "zod";
import type { PlanningDocument } from "@prisma/client";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { PLANNING_DOC_CONFIG, type PlanningDocTypeKey } from "@/lib/claude/schemas";
import { renderPlanningDocsBlock } from "@/lib/claude/promptBuilder";
import { ClaudeRefusalError, ClaudeTruncatedError, classifyStopReason } from "@/lib/claude/errors";

export type GeneratePlanningDocInput = {
  type: PlanningDocTypeKey;
  projectTitle: string;
  premise: string | null;
  genre: string | null;
  existingDocs: PlanningDocument[];
  manuscriptText?: string | null;
  styleInterviewTranscript?: string | null;
  userNotes?: string | null;
};

const SYSTEM_PREAMBLE =
  "You are an expert developmental editor and ghostwriter helping an author plan their book. Respond only with the structured data requested.";

// Generous but bounded safety net - the 1M-token context window handles a
// full manuscript easily; this just guards against a pathologically large input.
const MAX_MANUSCRIPT_CHARS = 400_000;

export async function generatePlanningDoc(
  input: GeneratePlanningDocInput,
): Promise<Record<string, unknown>> {
  const config = PLANNING_DOC_CONFIG[input.type];

  const groundingParts = [
    `Book title: ${input.projectTitle}`,
    input.genre ? `Genre: ${input.genre}` : "",
    input.premise ? `Premise: ${input.premise}` : "",
    input.existingDocs.length > 0 ? renderPlanningDocsBlock(input.existingDocs) : "",
    input.manuscriptText
      ? `--- Uploaded manuscript (for grounding) ---\n${input.manuscriptText.slice(0, MAX_MANUSCRIPT_CHARS)}`
      : "",
    input.styleInterviewTranscript
      ? `--- Style interview transcript ---\n${input.styleInterviewTranscript}`
      : "",
  ].filter(Boolean);

  const instructionParts: string[] = [config.instructions];
  if (input.userNotes) {
    instructionParts.push(`Additional notes from the author: ${input.userNotes}`);
  }

  const response = await gemini.models.generateContent({
    model: selectModel("DRAFT"),
    contents: [
      {
        role: "user",
        parts: [{ text: `${groundingParts.join("\n\n")}\n\n${instructionParts.join("\n\n")}` }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PREAMBLE,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(config.schema),
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

  const parsed = config.schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ClaudeTruncatedError();
  }

  return parsed.data;
}
