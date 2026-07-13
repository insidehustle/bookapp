import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { projectId, chapterId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, projectId },
  });

  if (!chapter) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">Chapter not found.</p>
        <Link href={`/projects/${projectId}/chapters`} className="text-sm text-accent underline">
          Back to chapters
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/projects/${projectId}/chapters`}
        className="w-fit text-sm text-muted transition-colors hover:text-accent"
      >
        ← Back to chapters
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Chapter {chapter.order}: {chapter.title}
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">
            {chapter.wordCount.toLocaleString()} words
          </span>
          <Badge>{chapter.source === "UPLOADED" ? "Uploaded" : "AI-drafted"}</Badge>
        </div>
      </div>
      <Card>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {chapter.content}
        </p>
      </Card>
    </div>
  );
}
