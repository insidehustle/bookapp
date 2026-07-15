"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown as MarkdownExtension } from "tiptap-markdown";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type PendingSelection = { from: number; to: number; text: string };

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

type ProjectFile = { id: string; filename: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onRequestRevision: (params: {
    selectedText: string;
    instruction: string;
    fileIds: string[];
  }) => Promise<string>;
  placeholder?: string;
  editable?: boolean;
  minHeight?: string;
  projectFiles?: ProjectFile[];
};

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs transition-colors ${
        active
          ? "bg-accent/20 text-accent"
          : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A rich-text editor that lets the user format text (bold/italic/headings/
 * lists) and highlight a passage to ask AI to revise just that span, with an
 * option to ground the revision in specific uploaded reference files -
 * shared across every editable generated document (planning docs, style
 * brief, chapter content).
 */
export function SelectableContent({
  value,
  onChange,
  onRequestRevision,
  placeholder,
  editable = true,
  minHeight = "16rem",
  projectFiles = [],
}: Props) {
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      MarkdownExtension.configure({ html: false, transformPastedText: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(updatedEditor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: "prose-content px-3 py-2 text-sm",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

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

  function openRevisionModal() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    setPendingSelection({ from, to, text: editor.state.doc.textBetween(from, to, "\n") });
    setModalOpen(true);
  }

  async function handleSubmitRevision() {
    if (!pendingSelection || !instruction.trim() || !editor) return;
    setIsRevising(true);
    setError(null);
    try {
      const replacement = await onRequestRevision({
        selectedText: pendingSelection.text,
        instruction: instruction.trim(),
        fileIds: Array.from(selectedFileIds),
      });
      editor
        .chain()
        .focus()
        .insertContentAt({ from: pendingSelection.from, to: pendingSelection.to }, replacement)
        .run();
      setModalOpen(false);
      setInstruction("");
      setPendingSelection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setIsRevising(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="tiptap-editor overflow-hidden rounded-lg">
        {editor && (
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-surface-2/95 px-2 py-1.5 backdrop-blur-sm">
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              label="Bold"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              label="Italic"
            >
              <em>I</em>
            </ToolbarButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolbarButton
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              label="Heading 1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              label="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              label="Heading 3"
            >
              H3
            </ToolbarButton>
            <div className="mx-1 h-4 w-px bg-border" />
            <ToolbarButton
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              label="Bulleted list"
            >
              • List
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              label="Numbered list"
            >
              1. List
            </ToolbarButton>
          </div>
        )}

        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]"
          >
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={openRevisionModal}
              className="rounded-md bg-accent px-2 py-1 text-xs text-white shadow-[0_0_12px_-2px_var(--accent)] hover:brightness-110"
            >
              Ask AI to revise
            </button>
          </BubbleMenu>
        )}

        <EditorContent editor={editor} style={{ minHeight }} />
      </div>

      {modalOpen && pendingSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="flex w-full max-w-lg flex-col gap-3 shadow-[0_0_60px_-15px_var(--accent)]">
            <p className="text-sm font-medium">Revise selected text</p>
            <blockquote className="max-h-24 overflow-y-auto rounded-lg border border-border bg-background/60 p-2 text-xs italic text-foreground/80">
              {pendingSelection.text}
            </blockquote>
            <div className="flex flex-wrap gap-2">
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

            {projectFiles.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowFilePicker((prev) => !prev)}
                  className="text-xs text-muted transition-colors hover:text-accent"
                >
                  {selectedFileIds.size}/{projectFiles.length} reference files selected
                </button>
                {showFilePicker && (
                  <div className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-background/60 p-2">
                    {projectFiles.map((file) => (
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

            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setModalOpen(false);
                  setPendingSelection(null);
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
