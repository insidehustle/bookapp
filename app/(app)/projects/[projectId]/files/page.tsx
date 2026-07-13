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
  await getOwnedProject(projectId, userId);

  const files = await prisma.manuscriptFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  return <FilesWorkspace projectId={projectId} initialFiles={files} />;
}
