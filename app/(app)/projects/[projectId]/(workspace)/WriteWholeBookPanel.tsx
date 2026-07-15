"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Chapter } from "@prisma/client";
import { createChapterSilent } from "@/app/actions/chapters";
import { extractStreamTrailer } from "@/lib/claude/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const TARGET_WORDS_PER_CHAPTER = 2500;
const MAX_ITERATIONS = 80;

type ChapterState = { id: string; order: number; title: string; content: string; wordCount: number };

export function WriteWholeBookPanel({
  projectId,
  targetWordCount,
  initialChapters,
}: {
  projectId: string;
  targetWordCount: number | null;
  initialChapters: Chapter[];
}) {
  const router = useRouter();
  const [chapters, setChapters] = useState<ChapterState[]>(
    initialChapters.map((c) => ({ id: c.id, order: c.order, title: c.title, content: c.content, wordCount: c.wordCount })),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRequested = useRef(false);

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  const progressPct = targetWordCount
    ? Math.min(100, Math.round((totalWords / targetWordCount) * 100))
    : 0;

  function stop() {
    stopRequested.current = true;
  }

  async function draftChapter(chapter: ChapterState, wordsRemaining: number) {
    const response = await fetch(`/api/projects/${projectId}/chapters/${chapter.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetWordCount: Math.min(wordsRemaining, TARGET_WORDS_PER_CHAPTER),
      }),
    });
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? `Chapter ${chapter.order} failed to generate.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
    }

    const { text, outcome } = extractStreamTrailer(full);
    if (outcome && outcome.type !== "ok") {
      throw new Error(
        outcome.type === "refusal"
          ? `Chapter ${chapter.order} was declined by the model.`
          : `Chapter ${chapter.order}'s response was cut off.`,
      );
    }
    return text;
  }

  async function handleWriteWholeBook() {
    if (!targetWordCount) return;
    setIsRunning(true);
    setError(null);
    stopRequested.current = false;

    try {
      let current = [...chapters];
      let iterations = 0;

      while (current.reduce((sum, c) => sum + c.wordCount, 0) < targetWordCount) {
        if (stopRequested.current) break;
        if (++iterations > MAX_ITERATIONS) {
          throw new Error(
            `Stopped after ${MAX_ITERATIONS} chapters without reaching the target - check the project for runaway generation.`,
          );
        }

        let next = current.find((c) => !c.content.trim());
        if (!next) {
          const created = await createChapterSilent(projectId);
          next = { id: created.id, order: created.order, title: created.title, content: "", wordCount: 0 };
          current = [...current, next];
          setChapters(current);
        }

        const wordsSoFar = current.reduce((sum, c) => sum + c.wordCount, 0);
        const wordsRemaining = targetWordCount - wordsSoFar;
        setCurrentLabel(`Writing Chapter ${next.order}: ${next.title}…`);

        const content = await draftChapter(next, wordsRemaining);
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        current = current.map((c) => (c.id === next!.id ? { ...c, content, wordCount } : c));
        setChapters(current);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Writing the book failed.");
    } finally {
      setIsRunning(false);
      setCurrentLabel(null);
    }
  }

  if (!targetWordCount) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="font-medium">Write the whole book</h2>
        <p className="text-sm text-muted">
          Set a target word count in{" "}
          <Link href={`/projects/${projectId}/settings`} className="text-accent hover:underline">
            Project Settings
          </Link>{" "}
          first, so this knows when the book is done.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Write the whole book</h2>
        {!isRunning ? (
          <Button onClick={handleWriteWholeBook} className="px-3 py-1.5 text-xs">
            {totalWords > 0 ? "Continue writing" : "Write the whole book"}
          </Button>
        ) : (
          <Button variant="ghost" onClick={stop} className="px-3 py-1.5 text-xs">
            Stop after this chapter
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
        Drafts chapters one after another, in order, until the manuscript reaches your target
        length - each chapter is written with an explicit length target so the book isn&apos;t
        cut short.
      </p>

      <div className="flex flex-col gap-1">
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="font-mono text-xs text-muted">
          {totalWords.toLocaleString()} / {targetWordCount.toLocaleString()} words ({progressPct}%)
        </p>
      </div>

      {currentLabel && <p className="text-xs text-accent">{currentLabel}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
