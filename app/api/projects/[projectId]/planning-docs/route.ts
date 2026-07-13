import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { generatePlanningDoc } from "@/lib/claude/generatePlanningDoc";
import { renderPlanningDocMarkdown } from "@/lib/claude/schemas";
import { ClaudeRefusalError, ClaudeTruncatedError } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  type: z.enum(["REFERENCE_PLOT", "CHARACTER_PROFILES", "STORY_STRUCTURE"]),
  notes: z.string().max(4000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const { type, notes } = bodySchema.parse(await req.json());

  const [existingDocs, manuscriptFiles] = await Promise.all([
    prisma.planningDocument.findMany({ where: { projectId, type: { not: type } } }),
    prisma.manuscriptFile.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const manuscriptText =
    manuscriptFiles.length > 0
      ? manuscriptFiles.map((file) => file.extractedText).join("\n\n")
      : null;

  let data: Record<string, unknown>;
  try {
    data = await generatePlanningDoc({
      type,
      projectTitle: project.title,
      premise: project.premise,
      genre: project.genre,
      existingDocs,
      manuscriptText,
      userNotes: notes ?? null,
    });
  } catch (error) {
    if (error instanceof ClaudeRefusalError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof ClaudeTruncatedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }

  const content = renderPlanningDocMarkdown(data);

  const doc = await prisma.planningDocument.upsert({
    where: { projectId_type: { projectId, type } },
    create: { projectId, type, data: data as Prisma.InputJsonValue, content },
    update: { data: data as Prisma.InputJsonValue, content, version: { increment: 1 } },
  });

  return NextResponse.json({ doc });
}
