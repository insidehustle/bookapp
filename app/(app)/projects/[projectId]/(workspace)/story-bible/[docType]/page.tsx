import { notFound } from "next/navigation";
import type { PlanningDocType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { StoryBibleDocEditor } from "./StoryBibleDocEditor";

const LABELS: Record<PlanningDocType, string> = {
  REFERENCE_PLOT: "Synopsis",
  CHARACTER_PROFILES: "Characters",
  STORY_STRUCTURE: "Outline",
  STYLE_BRIEF: "Style",
};

function isPlanningDocType(value: string): value is PlanningDocType {
  return value in LABELS;
}

export default async function StoryBibleDocPage({
  params,
}: {
  params: Promise<{ projectId: string; docType: string }>;
}) {
  const { projectId, docType } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  if (!isPlanningDocType(docType)) {
    notFound();
  }

  const [doc, interviewMessages, files] = await Promise.all([
    prisma.planningDocument.findFirst({ where: { projectId, type: docType } }),
    docType === "STYLE_BRIEF"
      ? prisma.styleInterviewMessage.findMany({
          where: { projectId },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.manuscriptFile.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <StoryBibleDocEditor
      projectId={projectId}
      docType={docType}
      label={LABELS[docType]}
      initialDoc={doc}
      initialInterviewMessages={interviewMessages}
      files={files}
    />
  );
}
