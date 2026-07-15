"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ManuscriptFile } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = {
  projectId: string;
  initialFiles: ManuscriptFile[];
};

export function FilesWorkspace({ projectId, initialFiles }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<ManuscriptFile[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File) || !fileEntry.name) {
      setError("Choose a file first.");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Upload failed.");
      }
      setFiles((prev) => [...prev, body.file as ManuscriptFile]);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Delete failed.");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  async function handleGenerateChapters() {
    if (files.length === 0) return;
    if (
      !window.confirm(
        "This replaces any chapters currently in this project with chapters generated from your uploaded files. Continue?",
      )
    ) {
      return;
    }
    setIsGenerating(true);
    setError(null);
    setGenerateMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/chapters/generate-from-files`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Generating chapters failed.");
      }
      setGenerateMessage(`Created ${body.chapterCount} chapter(s) — opening your project…`);
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generating chapters failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Files</h1>
      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface/70 p-4 backdrop-blur-sm"
      >
        <div>
          <p className="text-sm font-medium">Upload a draft manuscript file</p>
          <p className="text-xs text-muted">
            DOCX, PDF, TXT, or MD, up to 20MB. Upload as many files as you
            like — a full draft, or separate files per chapter/part.
          </p>
        </div>
        <input
          type="file"
          name="file"
          accept=".docx,.pdf,.txt,.md"
          required
          className="rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent/20 file:px-3 file:py-1.5 file:text-accent"
        />
        <Button type="submit" disabled={isUploading} className="w-fit">
          {isUploading ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}
      {generateMessage && <p className="text-sm text-accent-2">{generateMessage}</p>}

      {files.length === 0 ? (
        <p className="text-sm text-muted">No files uploaded yet.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {files.map((file) => (
              <li key={file.id}>
                <Card className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{file.filename}</div>
                    <div className="font-mono text-xs text-muted">
                      {file.wordCount.toLocaleString()} words · uploaded{" "}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </button>
                </Card>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={handleGenerateChapters} disabled={isGenerating} className="w-fit">
            {isGenerating ? "Generating…" : "Generate chapters from files"}
          </Button>
        </>
      )}
    </div>
  );
}
