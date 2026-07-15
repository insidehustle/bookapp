"use client";

import { useState } from "react";
import type { PlanningDocument } from "@prisma/client";
import { extractStreamTrailer } from "@/lib/claude/errors";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/Markdown";

type Message = { id: string; role: "USER" | "ASSISTANT"; content: string };

type Props = {
  projectId: string;
  initialMessages: Message[];
  onFinalized: (doc: PlanningDocument) => void;
};

export function StyleInterviewPanel({ projectId, initialMessages, onFinalized }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    setError(null);

    const userMessage: Message = { id: `local-${Date.now()}-u`, role: "USER", content: text };
    const assistantId = `local-${Date.now()}-a`;
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "ASSISTANT", content: "" }]);
    setInput("");

    try {
      const response = await fetch(`/api/projects/${projectId}/style-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok || !response.body) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(responseBody?.error ?? "The interview turn failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const { text: visibleText } = extractStreamTrailer(full);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: visibleText } : m)),
        );
      }

      const { outcome } = extractStreamTrailer(full);
      if (outcome && outcome.type !== "ok") {
        setError(
          outcome.type === "refusal"
            ? "Claude declined to respond to that."
            : "The response was cut off — try a shorter message.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The interview turn failed.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsSending(false);
    }
  }

  async function handleFinalize() {
    setIsFinalizing(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/style-interview/finalize`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Finalizing failed.");
      }
      onFinalized(body.doc as PlanningDocument);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finalizing failed.");
    } finally {
      setIsFinalizing(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-medium">Style Interview</h2>
      <p className="text-xs text-muted">
        A quick back-and-forth about tone, pacing, voice, and what to preserve
        or change — Claude turns this into a style brief that guides every
        draft, rewrite, and polish pass.
      </p>

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-background/60 p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted">Say hello to start the interview.</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              message.role === "USER"
                ? "self-end bg-accent text-white"
                : "self-start border border-border bg-surface-2"
            }`}
          >
            {message.content ? <Markdown content={message.content} /> : "…"}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type your answer or question..."
          className="flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={isSending || !input.trim()}>
          Send
        </Button>
      </form>

      <Button
        variant="secondary"
        onClick={handleFinalize}
        disabled={isFinalizing || messages.length === 0}
        className="w-fit px-3 py-1.5 text-xs"
      >
        {isFinalizing ? "Finalizing…" : "Finalize style brief"}
      </Button>
    </Card>
  );
}
