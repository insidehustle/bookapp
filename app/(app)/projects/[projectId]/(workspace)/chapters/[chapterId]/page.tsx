import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { ChapterEditor } from "./ChapterEditor";

export default async function ChapterEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { projectId, chapterId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const [chapter, files] = await Promise.all([
    prisma.chapter.findFirst({ where: { id: chapterId, projectId } }),
    prisma.manuscriptFile.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!chapter) {
    return <p className="text-sm text-muted">Chapter not found.</p>;
  }

  return <ChapterEditor projectId={projectId} chapter={chapter} files={files} />;
}
