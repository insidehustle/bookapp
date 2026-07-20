import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { FeedbackPanel } from "./FeedbackPanel";
import { ManuscriptReader } from "./ManuscriptReader";

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

      <ManuscriptReader chapters={chapters} />
    </div>
  );
}
