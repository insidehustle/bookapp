import type { ManuscriptFile } from "@prisma/client";
import { splitChapters, type SplitChapter } from "@/lib/manuscript/splitChapters";

/**
 * Runs the heading-detection split independently on each uploaded file (in
 * upload order) and concatenates the results - handles both a single file
 * containing the whole draft (split by its own headings) and several files
 * each representing one chapter/part (each becomes its own chapter, further
 * split if it itself contains headings).
 */
export function generateChaptersFromFiles(files: ManuscriptFile[]): SplitChapter[] {
  const ordered = [...files].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return ordered.flatMap((file) => splitChapters(file.extractedText));
}
