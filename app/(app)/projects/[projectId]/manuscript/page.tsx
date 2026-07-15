import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/Markdown";
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Manuscript</h1>
        {chapters.length > 0 && (
          <a
            href={`/api/projects/${projectId}/manuscript/export`}
            download
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Export as Word (.docx)
          </a>
        )}
      </div>

      <FeedbackPanel projectId={projectId} />

      {chapters.length === 0 ? (
        <p className="text-sm text-muted">
          No chapters yet — nothing to show here until some exist.
        </p>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface/60 p-3 text-xs">
            {chapters.map((chapter) => (
              <a
                key={chapter.id}
                href={`#chapter-${chapter.order}`}
                className="rounded-md border border-border px-2 py-1 text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {chapter.order}. {chapter.title}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-6">
            {chapters.map((chapter) => (
              <Card key={chapter.id} as="article" id={`chapter-${chapter.order}`}>
                <h2 className="mb-2 font-medium">
                  Chapter {chapter.order}: {chapter.title}
                </h2>
                <Markdown content={chapter.content} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
