import type { Chapter, PlanningDocument } from "@prisma/client";
import { PLANNING_DOC_CONFIG } from "@/lib/claude/schemas";

/**
 * Deterministic - same input always renders to the same string, which is
 * required for prompt caching to actually hit (see plan section 4).
 */
export function renderPlanningDocsBlock(docs: PlanningDocument[]): string {
  const ordered = [...docs].sort((a, b) => a.type.localeCompare(b.type));
  if (ordered.length === 0) return "";
  return ordered
    .map((doc) => {
      const label = PLANNING_DOC_CONFIG[doc.type as keyof typeof PLANNING_DOC_CONFIG]?.label ?? doc.type;
      return `### ${label}\n${doc.content}`;
    })
    .join("\n\n");
}

export function renderManuscriptSoFarBlock(chapters: Chapter[]): string {
  const ordered = [...chapters].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) return "";
  return ordered
    .map((chapter) => `### Chapter ${chapter.order}: ${chapter.title}\n${chapter.content}`)
    .join("\n\n");
}

export function renderReferenceFilesBlock(
  files: { filename: string; extractedText: string }[],
): string {
  const ordered = [...files].sort((a, b) => a.filename.localeCompare(b.filename));
  if (ordered.length === 0) return "";
  return ordered
    .map((file) => `### ${file.filename}\n${file.extractedText}`)
    .join("\n\n");
}
