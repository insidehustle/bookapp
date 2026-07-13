"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function BrainstormPanel({ projectId }: { projectId: string }) {
  const [prompt, setPrompt] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brainstorm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Brainstorm failed.");
      }
      setIdeas(body.brainstorm.ideas as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Brainstorm failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-medium">Brainstorm</h2>
      <p className="text-xs text-muted">
        Names, titles, or any other idea list — e.g. &quot;surname for a
        stoic detective&quot; or &quot;title options for a heist novel&quot;.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="What do you need ideas for?"
          className="flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={isLoading || !prompt.trim()}>
          {isLoading ? "Generating…" : "Generate ideas"}
        </Button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      {ideas.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-border bg-background/60 p-3 text-sm">
          {ideas.map((idea, index) => (
            <li key={index} className="flex gap-2">
              <span className="font-mono text-accent-2">{`0${index + 1}`.slice(-2)}</span>
              {idea}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
