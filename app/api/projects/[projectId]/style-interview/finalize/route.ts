import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { generatePlanningDoc } from "@/lib/claude/generatePlanningDoc";
import { renderPlanningDocMarkdown } from "@/lib/claude/schemas";
import { toApiErrorResponse } from "@/lib/claude/errors";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const [transcript, existingDocs] = await Promise.all([
    prisma.styleInterviewMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.planningDocument.findMany({
      where: { projectId, type: { not: "STYLE_BRIEF" } },
    }),
  ]);

  if (transcript.length === 0) {
    return NextResponse.json({ error: "No interview conversation yet." }, { status: 400 });
  }

  const transcriptText = transcript
    .map((m) => `${m.role === "USER" ? "Author" : "Editor"}: ${m.content}`)
    .join("\n\n");

  let data: Record<string, unknown>;
  try {
    data = await generatePlanningDoc({
      type: "STYLE_BRIEF",
      projectTitle: project.title,
      premise: project.premise,
      genre: project.genre,
      existingDocs,
      styleInterviewTranscript: transcriptText,
    });
  } catch (error) {
    const { message, status } = toApiErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  const content = renderPlanningDocMarkdown(data);

  const doc = await prisma.planningDocument.upsert({
    where: { projectId_type: { projectId, type: "STYLE_BRIEF" } },
    create: { projectId, type: "STYLE_BRIEF", data: data as Prisma.InputJsonValue, content },
    update: { data: data as Prisma.InputJsonValue, content, version: { increment: 1 } },
  });

  return NextResponse.json({ doc });
}
