import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { createChapter } from "@/app/actions/chapters";
import { WriteWholeBookPanel } from "./WriteWholeBookPanel";

export default async function WorkspaceIndexPage({
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
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-xl font-semibold">
          {chapters.length === 0 ? "Let's start your book" : "Select a chapter or Story Bible section"}
        </h1>
        <p className="max-w-sm text-sm text-muted">
          {chapters.length === 0
            ? "Fill in your Story Bible on the left, then create your first chapter and let AI draft it - or write the whole book at once below."
            : "Pick a chapter from the left to write or rewrite it, or open a Story Bible section to plan."}
        </p>
        {chapters.length === 0 && (
          <form action={createChapter.bind(null, projectId)}>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white shadow-[0_0_0_1px_rgba(124,92,255,0.5)] hover:shadow-[0_0_24px_-4px_var(--accent)] hover:brightness-110"
            >
              Create Chapter 1
            </button>
          </form>
        )}
        <Link
          href={`/projects/${projectId}/story-bible/REFERENCE_PLOT`}
          className="text-xs text-muted underline hover:text-accent"
        >
          Or start with your Story Bible
        </Link>
      </div>

      <div className="w-full text-left">
        <WriteWholeBookPanel
          projectId={projectId}
          targetWordCount={project.targetWordCount}
          initialChapters={chapters}
        />
      </div>
    </div>
  );
}
