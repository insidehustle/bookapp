"use client";

import { useState } from "react";
import type { Feedback } from "@/lib/claude/schemas";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/Markdown";

export function FeedbackPanel({ projectId }: { projectId: string }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGetFeedback() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/feedback`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Feedback failed.");
      }
      setFeedback(body.feedback as Feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Feedback</h2>
        <Button
          variant="secondary"
          onClick={handleGetFeedback}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs"
        >
          {isLoading ? "Reading…" : feedback ? "Regenerate feedback" : "Get feedback"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        A read-only critique of the manuscript as it stands — this never
        edits your chapters.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      {feedback && (
        <div className="flex flex-col gap-3 text-sm">
          <div className="text-foreground/90">
            <Markdown content={feedback.overallImpression} inline />
          </div>
          <div>
            <p className="font-medium text-accent-2">Strengths</p>
            <ul className="list-inside list-disc text-foreground/80">
              {feedback.strengths.map((strength, index) => (
                <li key={index}>
                  <Markdown content={strength} inline />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-accent-2">Suggestions</p>
            <ul className="flex flex-col gap-2">
              {feedback.suggestions.map((suggestion, index) => (
                <li key={index} className="rounded-lg border border-border bg-background/60 p-2">
                  <span className="font-medium">{suggestion.area}:</span>{" "}
                  <Markdown content={suggestion.issue} inline />{" "}
                  <span className="text-muted">
                    → <Markdown content={suggestion.suggestion} inline />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
