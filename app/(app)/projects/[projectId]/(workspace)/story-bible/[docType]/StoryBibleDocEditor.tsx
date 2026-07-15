"use client";

import { useState } from "react";
import type { ManuscriptFile, PlanningDocument } from "@prisma/client";
import { saveStoryBibleContent } from "@/app/actions/planningDocs";
import { SelectableContent } from "@/components/SelectableContent";
import { Button } from "@/components/ui/Button";
import { StyleInterviewPanel } from "./StyleInterviewPanel";

type DocType = "REFERENCE_PLOT" | "CHARACTER_PROFILES" | "STORY_STRUCTURE" | "STYLE_BRIEF";

type Message = { id: string; role: "USER" | "ASSISTANT"; content: string };

export function StoryBibleDocEditor({
  projectId,
  docType,
  label,
  initialDoc,
  initialInterviewMessages,
  files,
}: {
  projectId: string;
  docType: DocType;
  label: string;
  initialDoc: PlanningDocument | null;
  initialInterviewMessages: Message[];
  files: ManuscriptFile[];
}) {
  const [doc, setDoc] = useState<PlanningDocument | null>(initialDoc);
  const [buffer, setBuffer] = useState(initialDoc?.content ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    () => new Set(files.map((f) => f.id)),
  );

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

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/planning-docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: docType, fileIds: Array.from(selectedFileIds) }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Generation failed.");
      }
      const newDoc = body.doc as PlanningDocument;
      setDoc(newDoc);
      setBuffer(newDoc.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const saved = await saveStoryBibleContent(projectId, docType, buffer);
      setDoc(saved);
      setBuffer(saved.content);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReviseSelection(params: {
    selectedText: string;
    instruction: string;
    fileIds: string[];
  }) {
    if (!doc?.id) throw new Error("Save this section at least once before asking AI to revise it.");
    const response = await fetch(`/api/projects/${projectId}/revise-selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planningDocId: doc.id, ...params }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Revision failed.");
    }
    return body.replacement as string;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{label}</h1>
        {docType !== "STYLE_BRIEF" && (
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilePicker((prev) => !prev)}
                className="text-xs text-muted transition-colors hover:text-accent"
              >
                {selectedFileIds.size}/{files.length} files selected
              </button>
            )}
            <Button onClick={handleGenerate} disabled={isGenerating} className="px-3 py-1.5 text-xs">
              {isGenerating ? "Generating…" : doc ? "Regenerate with AI" : "Generate with AI"}
            </Button>
          </div>
        )}
      </div>

      {showFilePicker && files.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface/60 p-3">
          <p className="mb-1 text-xs text-muted">
            Files to ground this generation in — untick any you want left out.
          </p>
          {files.map((file) => (
            <label key={file.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedFileIds.has(file.id)}
                onChange={() => toggleFile(file.id)}
              />
              {file.filename}
              <span className="font-mono text-xs text-muted">
                ({file.wordCount.toLocaleString()} words)
              </span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        <SelectableContent
          value={buffer}
          onChange={setBuffer}
          onRequestRevision={handleReviseSelection}
          placeholder="Write freely, or use Generate with AI / the interview below to fill this in."
          projectFiles={files}
        />
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={isSaving || buffer === (doc?.content ?? "")}
          className="w-fit px-3 py-1.5 text-xs"
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>

      {docType === "STYLE_BRIEF" && (
        <StyleInterviewPanel
          projectId={projectId}
          initialMessages={initialInterviewMessages}
          onFinalized={(finalizedDoc) => {
            setDoc(finalizedDoc);
            setBuffer(finalizedDoc.content);
          }}
        />
      )}
    </div>
  );
}
