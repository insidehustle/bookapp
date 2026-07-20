"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ImportVoiceForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/voices/import", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Import failed.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.push(`/voices/${body.voice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Import a voice</h2>
      <p className="text-xs text-muted">
        Bring in a voice exported from this app (or someone else&apos;s) as a .json file.
      </p>
      <form onSubmit={handleImport} className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="text-sm"
        />
        <Button type="submit" variant="secondary" disabled={isImporting} className="px-3 py-1.5 text-xs">
          {isImporting ? "Importing…" : "Import"}
        </Button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
