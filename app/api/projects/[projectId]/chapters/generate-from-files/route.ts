import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { generateChaptersFromFiles } from "@/lib/manuscript/generateChaptersFromFiles";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const files = await prisma.manuscriptFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  if (files.length === 0) {
    return NextResponse.json({ error: "Upload at least one file first." }, { status: 400 });
  }

  const chapters = generateChaptersFromFiles(files);
  if (chapters.length === 0) {
    return NextResponse.json(
      { error: "No text could be extracted from the uploaded files." },
      { status: 400 },
    );
  }

  // Replaces whatever chapters currently exist - the UI confirms this before
  // calling here.
  await prisma.$transaction([
    prisma.chapter.deleteMany({ where: { projectId } }),
    prisma.chapter.createMany({
      data: chapters.map((chapter, index) => ({
        projectId,
        order: index + 1,
        title: chapter.title || `Chapter ${index + 1}`,
        content: chapter.content,
        status: "DRAFTED",
        source: "UPLOADED",
        wordCount: chapter.content.split(/\s+/).filter(Boolean).length,
      })),
    }),
    prisma.project.update({ where: { id: projectId }, data: { status: "DRAFTING" } }),
  ]);

  return NextResponse.json({ chapterCount: chapters.length });
}
