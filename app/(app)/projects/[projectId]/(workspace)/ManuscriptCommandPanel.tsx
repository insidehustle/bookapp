"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Chapter, ManuscriptFile } from "@prisma/client";
import { extractStreamTrailer, describeStreamOutcome } from "@/lib/claude/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Project-wide command: one instruction (optionally grounded in reference
 * files) applied as a rewrite across as many already-drafted chapters as the
 * user picks, one at a time - distinct from per-chapter Rewrite, which only
 * ever touches the chapter you're currently viewing.
 */
export function ManuscriptCommandPanel({
  projectId,
  chapters,
  files,
}: {
  projectId: string;
  chapters: Chapter[];
  files: ManuscriptFile[];
}) {
  const router = useRouter();
  const draftedChapters = chapters.filter((chapter) => chapter.content.trim());

  const [instruction, setInstruction] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(
    () => new Set(draftedChapters.map((chapter) => chapter.id)),
  );
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stopRequested = useRef(false);

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllChapters() {
    setSelectedChapterIds((prev) =>
      prev.size === draftedChapters.length
        ? new Set()
        : new Set(draftedChapters.map((chapter) => chapter.id)),
    );
  }

  function toggleFile(id: string) {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function stop() {
    stopRequested.current = true;
  }

  async function handleApply() {
    if (!instruction.trim() || selectedChapterIds.size === 0) return;
    setIsRunning(true);
    setError(null);
    setDoneCount(0);
    stopRequested.current = false;

    const targets = draftedChapters.filter((chapter) => selectedChapterIds.has(chapter.id));

    try {
      for (const chapter of targets) {
        if (stopRequested.current) break;
        setCurrentLabel(`Rewriting Chapter ${chapter.order}: ${chapter.title}…`);

        const response = await fetch(`/api/projects/${projectId}/chapters/${chapter.id}/rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: instruction.trim(),
            fileIds: Array.from(selectedFileIds),
          }),
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? `Chapter ${chapter.order} failed.`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
        }

        const { outcome } = extractStreamTrailer(full);
        if (outcome && outcome.type !== "ok") {
          throw new Error(`Chapter ${chapter.order}: ${describeStreamOutcome(outcome)}`);
        }

        setDoneCount((count) => count + 1);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The batch rewrite failed.");
    } finally {
      setIsRunning(false);
      setCurrentLabel(null);
    }
  }

  if (draftedChapters.length === 0) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-medium">Command a change across chapters</h2>
      <p className="text-xs text-muted">
        Describe what you want changed - a rename, a tone shift, tightening pacing - and apply it
        across as many drafted chapters as you pick, one at a time, optionally grounded in
        reference files.
      </p>

      <textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        placeholder="e.g. Rename the character 'Mara' to 'Elena' everywhere, and make her dialogue warmer."
        rows={3}
        className="rounded-lg px-3 py-2 text-sm"
        disabled={isRunning}
      />

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-muted">
            {selectedChapterIds.size}/{draftedChapters.length} chapters selected
          </span>
          <button
            type="button"
            onClick={toggleAllChapters}
            disabled={isRunning}
            className="text-xs text-accent hover:underline disabled:opacity-50"
          >
            {selectedChapterIds.size === draftedChapters.length ? "Select none" : "Select all"}
          </button>
        </div>
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-background/60 p-2">
          {draftedChapters.map((chapter) => (
            <label key={chapter.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={selectedChapterIds.has(chapter.id)}
                onChange={() => toggleChapter(chapter.id)}
                disabled={isRunning}
              />
              Chapter {chapter.order}: {chapter.title}
            </label>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowFilePicker((prev) => !prev)}
            disabled={isRunning}
            className="text-xs text-muted transition-colors hover:text-accent disabled:opacity-50"
          >
            {selectedFileIds.size}/{files.length} reference files selected
          </button>
          {showFilePicker && (
            <div className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-background/60 p-2">
              {files.map((file) => (
                <label key={file.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.has(file.id)}
                    onChange={() => toggleFile(file.id)}
                    disabled={isRunning}
                  />
                  {file.filename}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button
            onClick={handleApply}
            disabled={!instruction.trim() || selectedChapterIds.size === 0}
            className="px-3 py-1.5 text-xs"
          >
            Apply to {selectedChapterIds.size} chapter{selectedChapterIds.size === 1 ? "" : "s"}
          </Button>
        ) : (
          <Button variant="ghost" onClick={stop} className="px-3 py-1.5 text-xs">
            Stop after this chapter
          </Button>
        )}
        {isRunning && (
          <span className="text-xs text-muted">
            {doneCount}/{selectedChapterIds.size} done
          </span>
        )}
      </div>

      {currentLabel && <p className="text-xs text-accent">{currentLabel}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
