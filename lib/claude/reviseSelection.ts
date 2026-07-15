import { z } from "zod";
import { gemini } from "@/lib/claude/client";
import { selectModel } from "@/lib/claude/models";
import { SelectionReviseSchema } from "@/lib/claude/schemas";
import { ClaudeRefusalError, ClaudeTruncatedError, classifyStopReason } from "@/lib/claude/errors";

export async function reviseSelection(params: {
  fullContext: string;
  selectedText: string;
  instruction: string;
  referenceFilesText?: string | null;
}): Promise<string> {
  const response = await gemini.models.generateContent({
    model: selectModel("SELECTION_REVISE"),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Full document (for context only - do not revise anything outside the highlighted passage):",
              params.fullContext,
              "",
              ...(params.referenceFilesText
                ? ["Reference documents (for context/facts only - do not copy verbatim):", params.referenceFilesText, ""]
                : []),
              "Highlighted passage to revise:",
              `"""${params.selectedText}"""`,
              "",
              `Instruction: ${params.instruction}`,
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        "You are a precise line editor. The author has highlighted one exact passage inside a larger document and wants only that passage revised, per their instruction. Return only the replacement text for the highlighted passage - it will be spliced back into the document verbatim in place of the original, so match the surrounding voice and do not include any of the unchanged surrounding text.",
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(SelectionReviseSchema),
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

  const parsed = SelectionReviseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ClaudeTruncatedError();
  }

  return parsed.data.replacement;
}
