"use client";

import { useState } from "react";
import { extractStreamTrailer } from "@/lib/claude/errors";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/Markdown";

type Message = { id: string; role: "USER" | "ASSISTANT"; content: string };

export function ChatPanel({
  projectId,
  initialMessages,
}: {
  projectId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
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
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok || !response.body) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(responseBody?.error ?? "The message failed to send.");
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
      setError(err instanceof Error ? err.message : "The message failed to send.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <h2 className="text-xs uppercase tracking-wider text-muted">Chat</h2>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-surface/70 p-3 backdrop-blur-sm">
        {messages.length === 0 && (
          <p className="text-xs text-muted">
            Ask questions about your project, get writing suggestions, or
            think out loud. Grounded in your Story Bible and manuscript.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
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
          placeholder="Ask anything..."
          className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={isSending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
