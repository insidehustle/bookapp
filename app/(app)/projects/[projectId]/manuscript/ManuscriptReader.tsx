"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/Markdown";
import { CloseIcon } from "@/components/icons";

type Chapter = { id: string; order: number; title: string; content: string };
type QueueItem = { id: string; text: string };

const RATE_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export function ManuscriptReader({ chapters }: { chapters: Chapter[] }) {
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [selectionText, setSelectionText] = useState("");

  const rateRef = useRef(1);
  const queueRef = useRef<QueueItem[]>([]);
  const queueIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  // Speaks the queue one item at a time (rather than joining it into one
  // utterance) so a whole-book playback naturally pauses between chapters
  // and never risks hitting a single-utterance length limit.
  // Swapping in a premium/API-based voice later means replacing the body of
  // this function (and playQueue's speechSynthesis.cancel() call) with a
  // fetch-and-play-audio implementation - the queue/state model above it
  // (playWholeBook/playChapter/playSelection, isSpeaking/activeId) stays the same.
  function speakNextInQueue() {
    const queue = queueRef.current;
    const index = queueIndexRef.current;
    if (index >= queue.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveId(null);
      return;
    }
    const item = queue[index];
    setActiveId(item.id);
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = rateRef.current;
    utterance.onend = () => {
      queueIndexRef.current += 1;
      speakNextInQueue();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveId(null);
    };
    window.speechSynthesis.speak(utterance);
  }

  function playQueue(items: QueueItem[]) {
    if (!isSupported || items.length === 0) return;
    window.speechSynthesis.cancel();
    queueRef.current = items;
    queueIndexRef.current = 0;
    setIsSpeaking(true);
    setIsPaused(false);
    speakNextInQueue();
  }

  function playWholeBook() {
    playQueue(chapters.map((chapter) => ({ id: chapter.id, text: chapter.content })));
  }

  function playChapter(chapter: Chapter) {
    playQueue([{ id: chapter.id, text: chapter.content }]);
  }

  function playSelection() {
    if (!selectionText) return;
    playQueue([{ id: "selection", text: selectionText }]);
    setSelectionText("");
    window.getSelection()?.removeAllRanges();
  }

  function togglePause() {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }

  function stop() {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveId(null);
  }

  function handleSelectionChange() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (text && containerRef.current && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (containerRef.current.contains(range.commonAncestorContainer)) {
        setSelectionText(text);
        return;
      }
    }
    setSelectionText("");
  }

  if (chapters.length === 0) {
    return (
      <p className="text-sm text-muted">
        No chapters yet — nothing to show here until some exist.
      </p>
    );
  }

  const activeChapterTitle = chapters.find((chapter) => chapter.id === activeId)?.title;

  return (
    <div className="flex flex-col gap-4">
      {isSupported && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/60 p-3 text-xs">
          {!isSpeaking ? (
            <Button onClick={playWholeBook} className="px-3 py-1.5 text-xs">
              Play whole book
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={togglePause} className="px-3 py-1.5 text-xs">
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button variant="ghost" onClick={stop} className="px-3 py-1.5 text-xs">
                Stop
              </Button>
              <span className="text-muted">
                Reading: {activeChapterTitle ?? "selected text"}
              </span>
            </>
          )}
          <label className="ml-auto flex items-center gap-1.5 text-muted">
            Speed
            <select
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
              className="rounded-md px-2 py-1"
            >
              {RATE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}×
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <nav className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface/60 p-3 text-xs">
        {chapters.map((chapter) => (
          <a
            key={chapter.id}
            href={`#chapter-${chapter.order}`}
            className="rounded-md border border-border px-2 py-1 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {chapter.order}. {chapter.title}
          </a>
        ))}
      </nav>

      <div
        ref={containerRef}
        onMouseUp={handleSelectionChange}
        onTouchEnd={handleSelectionChange}
        className="flex flex-col gap-6"
      >
        {chapters.map((chapter) => (
          <Card key={chapter.id} as="article" id={`chapter-${chapter.order}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">
                Chapter {chapter.order}: {chapter.title}
              </h2>
              {isSupported && (
                <button
                  type="button"
                  onClick={() => playChapter(chapter)}
                  className="shrink-0 text-xs text-muted transition-colors hover:text-accent"
                >
                  {isSpeaking && activeId === chapter.id ? "Reading…" : "Read chapter"}
                </button>
              )}
            </div>
            <Markdown content={chapter.content} />
          </Card>
        ))}
      </div>

      {isSupported && selectionText && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2 text-xs shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
            <span className="max-w-[40vw] truncate text-muted">&quot;{selectionText}&quot;</span>
            <Button onClick={playSelection} className="px-3 py-1 text-xs">
              Read aloud
            </Button>
            <button
              type="button"
              onClick={() => setSelectionText("")}
              aria-label="Dismiss"
              className="text-muted hover:text-foreground"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
