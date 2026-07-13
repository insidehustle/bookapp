import { z } from "zod";

export const ReferencePlotDocSchema = z.object({
  summary: z
    .string()
    .describe("A concise 2-4 sentence summary of the book's premise and central conflict."),
  twistEnding: z.string().describe("How the story resolves, including any twist."),
  motive: z.string().describe("The underlying motive behind the central mystery/conflict."),
  method: z.string().describe("How the key event was carried out."),
  redHerrings: z
    .array(z.string())
    .describe("Misleading clues or distractions planted for the reader."),
  keyEvents: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .describe("Major plot beats in order."),
});
export type ReferencePlotDoc = z.infer<typeof ReferencePlotDocSchema>;

export const CharacterProfileSchema = z.object({
  name: z.string(),
  role: z.string().describe("e.g. Protagonist, Antagonist, Supporting"),
  archetype: z.string().optional(),
  traits: z.array(z.string()),
  motivations: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  arc: z.string().describe("How this character changes over the course of the book."),
});
export const CharacterProfilesSchema = z.object({
  characters: z.array(CharacterProfileSchema).min(1),
});
export type CharacterProfiles = z.infer<typeof CharacterProfilesSchema>;

export const StoryStructureSchema = z.object({
  frameworkName: z
    .string()
    .describe("e.g. 'Save the Cat', 'Hero's Journey', 'Three-Act Structure'"),
  beats: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
});
export type StoryStructure = z.infer<typeof StoryStructureSchema>;

export const StyleBriefSchema = z.object({
  tone: z.string(),
  pacingCadence: z.string(),
  voicePov: z.string().describe("Point of view and narrative voice preferences."),
  preserve: z.array(z.string()).describe("Elements of the existing draft to keep."),
  change: z.array(z.string()).describe("Elements to change or improve."),
  comparableTitles: z.array(z.string()),
  contentBoundaries: z
    .string()
    .describe("Content the author wants avoided or handled carefully."),
  additionalNotes: z.string(),
});
export type StyleBrief = z.infer<typeof StyleBriefSchema>;

export const SelectionReviseSchema = z.object({
  replacement: z.string().describe("The revised text that replaces exactly the selected span."),
});

export const FeedbackSchema = z.object({
  overallImpression: z.string().describe("A short, honest overall take on the manuscript so far."),
  strengths: z.array(z.string()).describe("What's working well."),
  suggestions: z
    .array(
      z.object({
        area: z.string().describe("e.g. 'Pacing', 'Character voice', 'Chapter 3'"),
        issue: z.string(),
        suggestion: z.string(),
      }),
    )
    .min(1)
    .max(8),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const BrainstormSchema = z.object({
  ideas: z.array(z.string()).min(5).max(20),
});
export type Brainstorm = z.infer<typeof BrainstormSchema>;

export const PLANNING_DOC_CONFIG = {
  REFERENCE_PLOT: {
    label: "Reference / Plot",
    schema: ReferencePlotDocSchema,
    instructions:
      "Generate a reference/plot document: summarize the premise, work out the twist ending, the underlying motive and method behind it, key red herrings, and the major plot beats in order.",
  },
  CHARACTER_PROFILES: {
    label: "Character Profiles",
    schema: CharacterProfilesSchema,
    instructions:
      "Generate character profiles for the principal cast: name, role, archetype, traits, motivations, strengths, weaknesses, and arc.",
  },
  STORY_STRUCTURE: {
    label: "Story Structure",
    schema: StoryStructureSchema,
    instructions:
      "Choose a story-structure framework appropriate to the genre (e.g. Three-Act Structure, Save the Cat, Hero's Journey) and map out its beats for this book specifically.",
  },
  STYLE_BRIEF: {
    label: "Style Brief",
    schema: StyleBriefSchema,
    instructions:
      "Distill the author's answers from the style interview transcript into a structured style brief: tone, pacing/cadence, voice/POV, what to preserve, what to change, comparable titles, content boundaries, and any additional notes.",
  },
} as const;

export type PlanningDocTypeKey = keyof typeof PLANNING_DOC_CONFIG;

function titleCase(camel: string): string {
  return camel
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function renderValue(value: unknown, depth = 0): string {
  const indent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}_(none)_`;
    return value
      .map((item) =>
        typeof item === "object" && item !== null
          ? `${indent}- ${renderValue(item, depth + 1).trim()}`
          : `${indent}- ${String(item)}`,
      )
      .join("\n");
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const rendered =
          typeof val === "object" && val !== null
            ? `\n${renderValue(val, depth + 1)}`
            : ` ${String(val)}`;
        return `${indent}**${titleCase(key)}:**${rendered}`;
      })
      .join("\n");
  }
  return `${indent}${String(value)}`;
}

/**
 * Renders a planning doc's structured data into deterministic markdown for
 * both display and prompt grounding. Pure function of `data` - required for
 * prompt-cache determinism (see plan section 4: render*Block functions must
 * be deterministic or the cache silently misses).
 */
export function renderPlanningDocMarkdown(data: unknown): string {
  return renderValue(data).trim();
}
