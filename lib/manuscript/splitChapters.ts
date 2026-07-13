export type SplitChapter = {
  title: string;
  content: string;
};

// Matches common chapter-heading conventions: "Chapter 1", "CHAPTER ONE",
// markdown "#"/"##" headings, and "Part Two" section breaks.
const HEADING_PATTERN =
  /^\s*(chapter\s+\S+.*|#{1,2}\s+.+|part\s+\S+.*)\s*$/i;

/**
 * Splits raw manuscript text into chapters using heading conventions found
 * in the text. Deliberately not AI-assisted (see the plan: re-running a
 * 50k+ word draft through the model just to find headings is wasteful) —
 * heuristics handle the common case, and a single-chapter fallback covers
 * everything else, ready for the author to manually re-split afterward.
 */
export function splitChapters(text: string): SplitChapter[] {
  const trimmedInput = text.trim();
  if (!trimmedInput) return [];

  const lines = trimmedInput.split(/\r\n|\r|\n/);
  const boundaries: { lineIndex: number; title: string }[] = [];

  lines.forEach((line, lineIndex) => {
    const match = line.match(HEADING_PATTERN);
    if (match) {
      const title = match[1].replace(/^#{1,2}\s+/, "").trim();
      boundaries.push({ lineIndex, title });
    }
  });

  if (boundaries.length === 0) {
    return [{ title: "Imported Draft", content: trimmedInput }];
  }

  const chapters: SplitChapter[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].lineIndex;
    const end =
      i + 1 < boundaries.length ? boundaries[i + 1].lineIndex : lines.length;
    const content = lines
      .slice(start + 1, end)
      .join("\n")
      .trim();

    // A heading-like line with no body beneath it before the next heading
    // is almost certainly a false positive (e.g. inline markdown emphasis)
    // rather than a real chapter break — skip it instead of creating an
    // empty chapter.
    if (!content) continue;

    chapters.push({
      title: boundaries[i].title.slice(0, 200) || `Chapter ${chapters.length + 1}`,
      content,
    });
  }

  if (chapters.length === 0) {
    return [{ title: "Imported Draft", content: trimmedInput }];
  }

  return mergeShortChapters(chapters);
}

// A heading match with only a couple of words beneath it before the next
// heading (e.g. a "PART ONE" section divider) is a section label, not a
// real chapter - fold it forward into the chapter that follows instead of
// leaving it as its own near-empty entry.
const MIN_CHAPTER_WORDS = 50;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function mergeShortChapters(chapters: SplitChapter[]): SplitChapter[] {
  if (chapters.length <= 1) return chapters;

  const merged: SplitChapter[] = [];
  let pendingPrefix = "";

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const isLast = i === chapters.length - 1;

    if (countWords(chapter.content) < MIN_CHAPTER_WORDS && !isLast) {
      pendingPrefix += `${chapter.content}\n\n`;
      continue;
    }

    merged.push({
      title: chapter.title,
      content: pendingPrefix ? `${pendingPrefix}${chapter.content}` : chapter.content,
    });
    pendingPrefix = "";
  }

  return merged;
}
