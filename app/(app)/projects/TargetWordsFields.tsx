"use client";

import { useState } from "react";

export function TargetWordsFields({
  defaultChapterCount,
  defaultWordsPerChapter,
}: {
  defaultChapterCount?: number | null;
  defaultWordsPerChapter?: number | null;
}) {
  const [chapterCount, setChapterCount] = useState(defaultChapterCount?.toString() ?? "");
  const [wordsPerChapter, setWordsPerChapter] = useState(defaultWordsPerChapter?.toString() ?? "");

  const chapters = Number(chapterCount);
  const words = Number(wordsPerChapter);
  const total = chapters > 0 && words > 0 ? chapters * words : null;

  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Number of chapters
        <input
          type="number"
          name="targetChapterCount"
          min={1}
          value={chapterCount}
          onChange={(event) => setChapterCount(event.target.value)}
          className="rounded-lg px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Words per chapter
        <input
          type="number"
          name="targetWordsPerChapter"
          min={100}
          value={wordsPerChapter}
          onChange={(event) => setWordsPerChapter(event.target.value)}
          className="rounded-lg px-3 py-2"
        />
        <span className="text-xs text-muted">
          {total !== null
            ? <>≈ <span className="font-medium text-foreground">{total.toLocaleString()}</span> total words</>
            : "Used by “Write the whole book” and as the default length for each chapter."}
        </span>
      </label>
    </>
  );
}
