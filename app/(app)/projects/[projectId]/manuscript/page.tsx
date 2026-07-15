import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { Card } from "@/components/ui/Card";
import { FeedbackPanel } from "./FeedbackPanel";

export default async function ManuscriptPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const chapters = await prisma.chapter.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <Link
        href={`/projects/${projectId}`}
        className="w-fit text-xs text-muted transition-colors hover:text-accent"
      >
        ← Back to {project.title}
      </Link>
      <h1 className="text-2xl font-semibold">Manuscript</h1>
      <FeedbackPanel projectId={projectId} />

      {chapters.length === 0 ? (
        <p className="text-sm text-muted">
          No chapters yet — nothing to show here until some exist.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {chapters.map((chapter) => (
            <Card key={chapter.id} as="article">
              <h2 className="mb-2 font-medium">
                Chapter {chapter.order}: {chapter.title}
              </h2>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{chapter.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
