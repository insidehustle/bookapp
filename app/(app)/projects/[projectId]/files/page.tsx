import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { FilesWorkspace } from "./FilesWorkspace";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const files = await prisma.manuscriptFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs text-muted transition-colors hover:text-accent"
        >
          ← Back to {project.title}
        </Link>
      </div>
      <FilesWorkspace projectId={projectId} initialFiles={files} />
    </div>
  );
}
