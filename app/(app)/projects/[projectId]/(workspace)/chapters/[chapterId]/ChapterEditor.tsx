"use client";

import { useState } from "react";
import type { Chapter, ManuscriptFile, Voice } from "@prisma/client";
import { updateChapterContent, undoChapterContent } from "@/app/actions/chapters";
import { saveChapterAsVoiceSample } from "@/app/actions/voices";
import { extractStreamTrailer } from "@/lib/claude/errors";
import { SelectableContent } from "@/components/SelectableContent";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function ChapterEditor({
  projectId,
  chapter,
  files,
  voices,
}: {
  projectId: string;
  chapter: Chapter;
  files: ManuscriptFile[];
  voices: Voice[];
}) {
  const [content, setContent] = useState(chapter.content);
  const [savedContent, setSavedContent] = useState(chapter.content);
  const [hasPrevious, setHasPrevious] = useState(chapter.previousContent !== null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeInstruction, setComposeInstruction] = useState("");
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const [saveAsVoiceId, setSaveAsVoiceId] = useState(voices[0]?.id ?? "");
  const [isSavingSample, setIsSavingSample] = useState(false);
  const [sampleSavedMessage, setSampleSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mode: "write" | "rewrite" = content.trim() ? "rewrite" : "write";

  function toggleFile(fileId: string) {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }

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

  async function handleCompose() {
    if (mode === "rewrite" && !composeInstruction.trim()) return;
    setComposeModalOpen(false);
    const endpoint = mode === "write" ? "generate" : "rewrite";
    await streamFrom(`/api/projects/${projectId}/chapters/${chapter.id}/${endpoint}`, {
      instruction: composeInstruction.trim(),
      fileIds: Array.from(selectedFileIds),
    });
    setComposeInstruction("");
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

  async function handleSaveAsVoiceSample() {
    if (!saveAsVoiceId) return;
    setIsSavingSample(true);
    setSampleSavedMessage(null);
    try {
      await saveChapterAsVoiceSample(saveAsVoiceId, projectId, chapter.id);
      setSampleSavedMessage("Saved to voice.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this chapter as a voice example.");
    } finally {
      setIsSavingSample(false);
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
        <Button
          variant={mode === "rewrite" ? "secondary" : "primary"}
          onClick={() => setComposeModalOpen(true)}
          disabled={isStreaming}
          className="px-3 py-1.5 text-xs"
        >
          {isStreaming ? "Writing…" : mode === "write" ? "Write" : "Rewrite"}
        </Button>
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
        {voices.length > 0 && content.trim() && (
          <div className="flex items-center gap-1.5">
            <select
              value={saveAsVoiceId}
              onChange={(event) => setSaveAsVoiceId(event.target.value)}
              className="rounded-lg px-2 py-1 text-xs"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              onClick={handleSaveAsVoiceSample}
              disabled={isSavingSample}
              className="px-2 py-1 text-xs"
            >
              {isSavingSample ? "Saving…" : sampleSavedMessage ?? "Save as voice example"}
            </Button>
          </div>
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

      {composeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-[0_0_60px_-15px_var(--accent)]">
            <p className="text-sm font-medium">
              {mode === "write" ? "Write this chapter" : "Rewrite this chapter"}
            </p>
            <textarea
              value={composeInstruction}
              onChange={(event) => setComposeInstruction(event.target.value)}
              placeholder={
                mode === "write"
                  ? "Optional - e.g. Open with the storm scene, keep it under 2000 words..."
                  : "e.g. Make the pacing tighter, add more tension to the ending..."
              }
              rows={3}
              className="rounded-lg px-3 py-2 text-sm"
              autoFocus
            />

            {files.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowFilePicker((prev) => !prev)}
                  className="text-xs text-muted transition-colors hover:text-accent"
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
                        />
                        {file.filename}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setComposeModalOpen(false);
                  setComposeInstruction("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompose}
                disabled={mode === "rewrite" && !composeInstruction.trim()}
              >
                {mode === "write" ? "Write" : "Rewrite"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
