"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Voice, VoiceSample, VoiceVersion } from "@prisma/client";
import {
  saveVoiceContent,
  updateVoiceMeta,
  addVoiceSample,
  deleteVoiceSample,
  restoreVoiceVersion,
} from "@/app/actions/voices";
import { SelectableContent } from "@/components/SelectableContent";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VoiceInterviewPanel } from "./VoiceInterviewPanel";

function DeleteVoiceSampleButton({ voiceId, sampleId }: { voiceId: string; sampleId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => deleteVoiceSample(voiceId, sampleId))}
      disabled={isPending}
      className="text-xs text-danger transition-colors hover:underline disabled:opacity-50"
    >
      {isPending ? "Removing…" : "Remove"}
    </button>
  );
}

type InterviewMessage = { id: string; role: "USER" | "ASSISTANT"; content: string };

export function VoiceBrainEditor({
  voice,
  samples,
  versions,
  interviewMessages,
  error: metaError,
}: {
  voice: Voice;
  samples: VoiceSample[];
  versions: VoiceVersion[];
  interviewMessages: InterviewMessage[];
  error?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState(voice.content);
  const [savedContent, setSavedContent] = useState(voice.content);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSamplePicker, setShowSamplePicker] = useState(false);
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(
    () => new Set(samples.map((sample) => sample.id)),
  );
  const [notes, setNotes] = useState("");

  function toggleSample(sampleId: string) {
    setSelectedSampleIds((prev) => {
      const next = new Set(prev);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/voices/${voice.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleIds: Array.from(selectedSampleIds),
          notes: notes.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Generation failed.");
      }
      setContent(body.voice.content);
      setSavedContent(body.voice.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const saved = await saveVoiceContent(voice.id, content);
      setContent(saved.content);
      setSavedContent(saved.content);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore(versionId: string) {
    setIsRestoring(versionId);
    try {
      const restored = await restoreVoiceVersion(voice.id, versionId);
      setContent(restored.content);
      setSavedContent(restored.content);
    } finally {
      setIsRestoring(null);
    }
  }

  async function handleUploadSample(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/voices/${voice.id}/samples/upload`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Upload failed.");
      }
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleReviseSelection(params: { selectedText: string; instruction: string }) {
    const response = await fetch(`/api/voices/${voice.id}/revise-selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Revision failed.");
    }
    return body.replacement as string;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        {metaError && <p className="text-sm text-danger">{metaError}</p>}
        <form action={updateVoiceMeta.bind(null, voice.id)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Name
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={voice.name}
              className="rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Description
            <textarea
              name="description"
              rows={2}
              maxLength={10000}
              defaultValue={voice.description ?? ""}
              className="rounded-lg px-3 py-2"
            />
          </label>
          <Button type="submit" variant="secondary" className="w-fit px-3 py-1.5 text-xs">
            Save details
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Brain</h2>
          <div className="flex items-center gap-2">
            {samples.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSamplePicker((prev) => !prev)}
                className="text-xs text-muted transition-colors hover:text-accent"
              >
                {selectedSampleIds.size}/{samples.length} samples selected
              </button>
            )}
            <Button onClick={handleGenerate} disabled={isGenerating} className="px-3 py-1.5 text-xs">
              {isGenerating ? "Generating…" : content ? "Regenerate with AI" : "Generate with AI"}
            </Button>
          </div>
        </div>

        {showSamplePicker && samples.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface/60 p-3">
            <p className="mb-1 text-xs text-muted">Samples to ground this generation in.</p>
            {samples.map((sample) => (
              <label key={sample.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSampleIds.has(sample.id)}
                  onChange={() => toggleSample(sample.id)}
                />
                {sample.label}
              </label>
            ))}
          </div>
        )}

        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional notes for the AI (e.g. specific things to emphasize)..."
          className="rounded-lg px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <SelectableContent
          value={content}
          onChange={setContent}
          onRequestRevision={handleReviseSelection}
          placeholder="Write freely, or use Generate with AI to fill this in from a description and reference samples."
        />
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={isSaving || content === savedContent}
            className="w-fit px-3 py-1.5 text-xs"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
          <a
            href={`/api/voices/${voice.id}/export`}
            download
            className="text-xs text-muted transition-colors hover:text-accent"
          >
            Export as JSON
          </a>
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="font-medium">Reference Samples</h2>
        <form action={addVoiceSample.bind(null, voice.id)} className="flex flex-col gap-2">
          <input
            name="label"
            required
            maxLength={200}
            placeholder="Label (e.g. 'Opening scene')"
            className="rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            name="content"
            required
            rows={4}
            placeholder="Paste a writing sample in this voice..."
            className="rounded-lg px-3 py-2 text-sm"
          />
          <Button type="submit" variant="secondary" className="w-fit px-3 py-1.5 text-xs">
            Add sample
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
            Upload a file (.txt, .md, .docx, .pdf)
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx,.pdf"
              onChange={handleUploadSample}
              disabled={isUploading}
              className="text-sm"
            />
          </label>
          {isUploading && <p className="text-xs text-muted">Uploading…</p>}
          {uploadError && <p className="text-sm text-danger">{uploadError}</p>}
        </div>

        {samples.length > 0 && (
          <ul className="flex flex-col gap-2">
            {samples.map((sample) => (
              <li
                key={sample.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{sample.label}</div>
                  <div className="text-xs text-muted">
                    {sample.source === "SAVED_FROM_CHAPTER" ? "From a chapter" : "Manual"} ·{" "}
                    {sample.content.split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>
                <DeleteVoiceSampleButton voiceId={voice.id} sampleId={sample.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <VoiceInterviewPanel
        voiceId={voice.id}
        initialMessages={interviewMessages}
        onFinalized={(finalized) => {
          setContent(finalized.content);
          setSavedContent(finalized.content);
        }}
      />

      <Card className="flex flex-col gap-3">
        <h2 className="font-medium">Version History</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-muted">
            No previous versions yet — saves and regenerations will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-2 text-sm"
              >
                <div>
                  <div className="font-medium">Version {version.version}</div>
                  <div className="text-xs text-muted">
                    {version.note ?? "Saved"} · {new Date(version.createdAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleRestore(version.id)}
                  disabled={isRestoring === version.id}
                  className="px-2 py-1 text-xs"
                >
                  {isRestoring === version.id ? "Restoring…" : "Restore"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
