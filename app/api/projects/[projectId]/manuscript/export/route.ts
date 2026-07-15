import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { buildManuscriptDocx } from "@/lib/manuscript/exportDocx";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const chapters = await prisma.chapter.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  if (chapters.length === 0) {
    return NextResponse.json({ error: "No chapters to export yet." }, { status: 400 });
  }

  const buffer = await buildManuscriptDocx({
    projectTitle: project.title,
    chapters: chapters.map((chapter) => ({
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
    })),
  });

  const filename = `${project.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "manuscript"}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
