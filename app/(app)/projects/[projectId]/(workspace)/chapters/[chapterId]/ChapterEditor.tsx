"use client";

import { useState } from "react";
import type { Chapter, ManuscriptFile } from "@prisma/client";
import { updateChapterContent, undoChapterContent } from "@/app/actions/chapters";
import { extractStreamTrailer } from "@/lib/claude/errors";
import { SelectableContent } from "@/components/SelectableContent";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function ChapterEditor({
  projectId,
  chapter,
  files,
}: {
  projectId: string;
  chapter: Chapter;
  files: ManuscriptFile[];
}) {
  const [content, setContent] = useState(chapter.content);
  const [savedContent, setSavedContent] = useState(chapter.content);
  const [hasPrevious, setHasPrevious] = useState(chapter.previousContent !== null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [rewriteModalOpen, setRewriteModalOpen] = useState(false);
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function streamFrom(url: string, body?: unknown) {
    setIsStreaming(true);
    setError(null);
    setContent("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (!response.ok || !response.body) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(responseBody?.error ?? "Generation failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const { text: visibleText } = extractStreamTrailer(full);
        setContent(visibleText);
      }

      const { text: finalText, outcome } = extractStreamTrailer(full);
      if (outcome && outcome.type !== "ok") {
        setError(
          outcome.type === "refusal"
            ? "The model declined to generate this."
            : "The response was cut off — try again or with a shorter instruction.",
        );
        setContent(savedContent);
        return;
      }
      setContent(finalText);
      setSavedContent(finalText);
      setHasPrevious(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setContent(savedContent);
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleWrite() {
    await streamFrom(`/api/projects/${projectId}/chapters/${chapter.id}/generate`);
  }

  async function handleRewrite() {
    if (!rewriteInstruction.trim()) return;
    setRewriteModalOpen(false);
    await streamFrom(`/api/projects/${projectId}/chapters/${chapter.id}/rewrite`, {
      instruction: rewriteInstruction.trim(),
    });
    setRewriteInstruction("");
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateChapterContent(projectId, chapter.id, content);
      setSavedContent(content);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUndo() {
    setIsUndoing(true);
    setError(null);
    try {
      await undoChapterContent(projectId, chapter.id);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nothing to undo.");
    } finally {
      setIsUndoing(false);
    }
  }

  async function handleReviseSelection(params: {
    selectedText: string;
    instruction: string;
    fileIds: string[];
  }) {
    const response = await fetch(`/api/projects/${projectId}/revise-selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: chapter.id, ...params }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Revision failed.");
    }
    return body.replacement as string;
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold sm:text-xl">
          Chapter {chapter.order}: {chapter.title}
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">{wordCount.toLocaleString()} words</span>
          <Badge>{chapter.source === "UPLOADED" ? "Uploaded" : "AI-drafted"}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface/60 p-2">
        {!content.trim() ? (
          <Button onClick={handleWrite} disabled={isStreaming} className="px-3 py-1.5 text-xs">
            {isStreaming ? "Writing…" : "Write"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setRewriteModalOpen(true)}
            disabled={isStreaming}
            className="px-3 py-1.5 text-xs"
          >
            Rewrite
          </Button>
        )}
        {hasPrevious && (
          <Button
            variant="ghost"
            onClick={handleUndo}
            disabled={isUndoing || isStreaming}
            className="px-3 py-1.5 text-xs"
          >
            {isUndoing ? "Undoing…" : "Undo last AI change"}
          </Button>
        )}
        <div className="ml-auto">
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={isSaving || isStreaming || content === savedContent}
            className="px-3 py-1.5 text-xs"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <SelectableContent
        value={content}
        onChange={setContent}
        onRequestRevision={handleReviseSelection}
        editable={!isStreaming}
        minHeight="32rem"
        projectFiles={files}
      />

      {rewriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-[0_0_60px_-15px_var(--accent)]">
            <p className="text-sm font-medium">Rewrite this chapter</p>
            <textarea
              value={rewriteInstruction}
              onChange={(event) => setRewriteInstruction(event.target.value)}
              placeholder="e.g. Make the pacing tighter, add more tension to the ending..."
              rows={3}
              className="rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setRewriteModalOpen(false);
                  setRewriteInstruction("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRewrite} disabled={!rewriteInstruction.trim()}>
                Rewrite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
