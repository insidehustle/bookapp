import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function ChaptersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const chapters = await prisma.chapter.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Chapters</h1>
      {chapters.length === 0 ? (
        <p className="text-sm text-muted">
          No chapters yet.{" "}
          <Link href={`/projects/${projectId}/files`} className="text-accent underline">
            Upload a draft manuscript
          </Link>{" "}
          on the Files tab and generate chapters from it, or check back once
          AI drafting is available.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <Link href={`/projects/${projectId}/chapters/${chapter.id}`}>
                <Card className="flex items-center justify-between transition-colors hover:border-accent">
                  <span className="font-medium">
                    Chapter {chapter.order}: {chapter.title}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted">
                      {chapter.wordCount.toLocaleString()} words
                    </span>
                    <Badge>{chapter.source === "UPLOADED" ? "Uploaded" : "AI-drafted"}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
