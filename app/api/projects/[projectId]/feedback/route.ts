import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { generateFeedback } from "@/lib/claude/generateFeedback";
import { ClaudeRefusalError, ClaudeTruncatedError } from "@/lib/claude/errors";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const [planningDocs, chapters, files] = await Promise.all([
    prisma.planningDocument.findMany({ where: { projectId } }),
    prisma.chapter.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
    prisma.manuscriptFile.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  const manuscriptText =
    chapters.length > 0
      ? chapters.map((chapter) => `Chapter ${chapter.order}: ${chapter.title}\n${chapter.content}`).join("\n\n")
      : files.map((file) => file.extractedText).join("\n\n");

  if (!manuscriptText.trim()) {
    return NextResponse.json(
      { error: "There's no manuscript content yet — upload files or draft some chapters first." },
      { status: 400 },
    );
  }

  try {
    const feedback = await generateFeedback({
      projectTitle: project.title,
      premise: project.premise,
      genre: project.genre,
      planningDocs,
      manuscriptText,
    });
    return NextResponse.json({ feedback });
  } catch (error) {
    if (error instanceof ClaudeRefusalError || error instanceof ClaudeTruncatedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
