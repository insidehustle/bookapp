"use client";

import { useState } from "react";
import type { PlanningDocument, StyleInterviewMessage } from "@prisma/client";
import { updatePlanningDocContent } from "@/app/actions/planningDocs";
import { SelectableContent } from "@/components/SelectableContent";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StyleInterviewPanel } from "./StyleInterviewPanel";
import { BrainstormPanel } from "./BrainstormPanel";

type DocType = "REFERENCE_PLOT" | "CHARACTER_PROFILES" | "STORY_STRUCTURE" | "STYLE_BRIEF";

const DOC_LABELS: Record<DocType, string> = {
  REFERENCE_PLOT: "Reference / Plot",
  CHARACTER_PROFILES: "Character Profiles",
  STORY_STRUCTURE: "Story Structure",
  STYLE_BRIEF: "Style Brief",
};

const GENERATABLE_TYPES: DocType[] = ["REFERENCE_PLOT", "CHARACTER_PROFILES", "STORY_STRUCTURE"];

type Props = {
  projectId: string;
  initialDocs: PlanningDocument[];
  initialInterviewMessages: StyleInterviewMessage[];
};

export function PlanningWorkspace({ projectId, initialDocs, initialInterviewMessages }: Props) {
  const [docs, setDocs] = useState<Partial<Record<DocType, PlanningDocument>>>(() => {
    const map: Partial<Record<DocType, PlanningDocument>> = {};
    for (const doc of initialDocs) map[doc.type as DocType] = doc;
    return map;
  });
  const [buffers, setBuffers] = useState<Partial<Record<DocType, string>>>(() => {
    const map: Partial<Record<DocType, string>> = {};
    for (const doc of initialDocs) map[doc.type as DocType] = doc.content;
    return map;
  });
  const [generating, setGenerating] = useState<DocType | null>(null);
  const [saving, setSaving] = useState<DocType | null>(null);
  const [docErrors, setDocErrors] = useState<Partial<Record<DocType, string>>>({});

  async function handleGenerate(type: DocType) {
    setGenerating(type);
    setDocErrors((prev) => ({ ...prev, [type]: undefined }));
    try {
      const response = await fetch(`/api/projects/${projectId}/planning-docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Generation failed.");
      }
      const doc = body.doc as PlanningDocument;
      setDocs((prev) => ({ ...prev, [type]: doc }));
      setBuffers((prev) => ({ ...prev, [type]: doc.content }));
    } catch (error) {
      setDocErrors((prev) => ({
        ...prev,
        [type]: error instanceof Error ? error.message : "Generation failed.",
      }));
    } finally {
      setGenerating(null);
    }
  }

  async function handleSave(type: DocType) {
    const doc = docs[type];
    if (!doc) return;
    setSaving(type);
    try {
      await updatePlanningDocContent(projectId, doc.id, buffers[type] ?? "");
      setDocs((prev) => {
        const current = prev[type];
        return current ? { ...prev, [type]: { ...current, content: buffers[type] ?? "" } } : prev;
      });
    } finally {
      setSaving(null);
    }
  }

  async function handleReviseSelection(
    type: DocType,
    revisionParams: { selectedText: string; instruction: string },
  ): Promise<string> {
    const doc = docs[type];
    if (!doc) throw new Error("Save or generate this document first.");
    const response = await fetch(`/api/projects/${projectId}/revise-selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planningDocId: doc.id, ...revisionParams }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Revision failed.");
    }
    return body.replacement as string;
  }

  function renderCard(type: DocType, canGenerate: boolean) {
    const doc = docs[type];
    return (
      <Card key={type} className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{DOC_LABELS[type]}</h2>
          {canGenerate && (
            <Button
              variant="secondary"
              onClick={() => handleGenerate(type)}
              disabled={generating === type}
              className="px-3 py-1.5 text-xs"
            >
              {generating === type
                ? "Generating…"
                : doc
                  ? "Regenerate with AI"
                  : "Generate with AI"}
            </Button>
          )}
        </div>
        {docErrors[type] && <p className="text-sm text-danger">{docErrors[type]}</p>}
        {doc ? (
          <>
            <SelectableContent
              value={buffers[type] ?? ""}
              onChange={(value) => setBuffers((prev) => ({ ...prev, [type]: value }))}
              onRequestRevision={(revisionParams) => handleReviseSelection(type, revisionParams)}
            />
            <Button
              variant="secondary"
              onClick={() => handleSave(type)}
              disabled={saving === type || buffers[type] === doc.content}
              className="w-fit px-3 py-1.5 text-xs"
            >
              {saving === type ? "Saving…" : "Save"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted">Not generated yet.</p>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Planning</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {GENERATABLE_TYPES.map((type) => renderCard(type, true))}
        {docs.STYLE_BRIEF && renderCard("STYLE_BRIEF", false)}
      </div>

      <StyleInterviewPanel
        projectId={projectId}
        initialMessages={initialInterviewMessages}
        onFinalized={(doc) => {
          setDocs((prev) => ({ ...prev, STYLE_BRIEF: doc }));
          setBuffers((prev) => ({ ...prev, STYLE_BRIEF: doc.content }));
        }}
      />

      <BrainstormPanel projectId={projectId} />
    </div>
  );
}
