"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Selection = { start: number; end: number; text: string };

const PRESETS = [
  {
    label: "Describe",
    instruction:
      "Add vivid, sensory description to this passage - help the reader see, hear, and feel the scene without slowing the pacing.",
  },
  {
    label: "Expand",
    instruction:
      "Expand this passage with more detail and scene-setting so it doesn't feel rushed - keep the same events and voice.",
  },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  onRequestRevision: (params: { selectedText: string; instruction: string }) => Promise<string>;
  rows?: number;
};

/**
 * A textarea that lets the user highlight a passage and ask AI to revise
 * just that span - shared across every editable generated document (planning
 * docs and the style brief now, chapter content once Stage 4/5 exist).
 */
export function SelectableContent({ value, onChange, onRequestRevision, rows = 12 }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelect() {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    if (selectionEnd > selectionStart) {
      setSelection({
        start: selectionStart,
        end: selectionEnd,
        text: value.slice(selectionStart, selectionEnd),
      });
    } else {
      setSelection(null);
    }
  }

  async function handleSubmitRevision() {
    if (!selection || !instruction.trim()) return;
    setIsRevising(true);
    setError(null);
    try {
      const replacement = await onRequestRevision({
        selectedText: selection.text,
        instruction: instruction.trim(),
      });
      const next = value.slice(0, selection.start) + replacement + value.slice(selection.end);
      onChange(next);
      setModalOpen(false);
      setInstruction("");
      setSelection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setIsRevising(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={handleSelect}
          onBlur={() => {
            // Keep the selection around briefly so a click on "Ask AI" isn't
            // lost to the blur event that fires first.
            window.setTimeout(() => {
              if (!modalOpen) setSelection(null);
            }, 150);
          }}
          rows={rows}
          className="w-full rounded-lg px-3 py-2 text-sm"
        />
        {selection && !modalOpen && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setModalOpen(true)}
            className="absolute right-2 top-2 rounded-md bg-accent px-2 py-1 text-xs text-white shadow-[0_0_12px_-2px_var(--accent)] hover:brightness-110"
          >
            Ask AI to revise
          </button>
        )}
      </div>

      {modalOpen && selection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="flex w-full max-w-lg flex-col gap-3 shadow-[0_0_60px_-15px_var(--accent)]">
            <p className="text-sm font-medium">Revise selected text</p>
            <blockquote className="max-h-24 overflow-y-auto rounded-lg border border-border bg-background/60 p-2 text-xs italic text-foreground/80">
              {selection.text}
            </blockquote>
            <div className="flex gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setInstruction(preset.instruction)}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="e.g. Make this more tense, tighten the pacing..."
              rows={3}
              className="rounded-lg px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setModalOpen(false);
                  setSelection(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmitRevision}
                disabled={isRevising || !instruction.trim()}
              >
                {isRevising ? "Revising…" : "Revise"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
