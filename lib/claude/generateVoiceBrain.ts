import { z } from "zod";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { VoiceBrainSchema, type VoiceBrain } from "@/lib/claude/schemas";
import { ClaudeRefusalError, ClaudeTruncatedError, classifyStopReason } from "@/lib/claude/errors";

export type GenerateVoiceBrainInput = {
  name: string;
  description: string | null;
  existingBrainContent?: string | null;
  samples: { label: string; content: string }[];
  userNotes?: string | null;
  interviewTranscript?: string | null;
};

const SYSTEM_PREAMBLE =
  "You are an expert writing coach distilling an author's writing voice into a structured style profile. Respond only with the structured data requested.";

export async function generateVoiceBrain(input: GenerateVoiceBrainInput): Promise<VoiceBrain> {
  const groundingParts = [
    `Voice name: ${input.name}`,
    input.description ? `Description: ${input.description}` : "",
    input.existingBrainContent
      ? `--- Current voice profile (refine this, don't discard it) ---\n${input.existingBrainContent}`
      : "",
    input.samples.length > 0
      ? `--- Reference writing samples ---\n${input.samples
          .map((sample) => `### ${sample.label}\n${sample.content}`)
          .join("\n\n")}`
      : "",
    input.interviewTranscript
      ? `--- Voice interview transcript ---\n${input.interviewTranscript}`
      : "",
    input.userNotes ? `Additional notes from the author: ${input.userNotes}` : "",
  ].filter(Boolean);

  const instruction =
    "Analyze the above and produce a structured writing-voice profile: tone, vocabulary, sentence structure, pacing, personality, humor, formality, cultural nuances, signature quirks, and forbidden patterns to avoid. If reference samples are present, base the profile primarily on what they actually demonstrate rather than the description alone.";

  const response = await gemini.models.generateContent({
    model: selectModel("DRAFT"),
    contents: [
      {
        role: "user",
        parts: [{ text: `${groundingParts.join("\n\n")}\n\n${instruction}` }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PREAMBLE,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(VoiceBrainSchema),
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

  const parsed = VoiceBrainSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ClaudeTruncatedError();
  }

  return parsed.data;
}
