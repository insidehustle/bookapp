import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { PlanningWorkspace } from "./PlanningWorkspace";

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const [planningDocs, interviewMessages] = await Promise.all([
    prisma.planningDocument.findMany({ where: { projectId } }),
    prisma.styleInterviewMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <PlanningWorkspace
      projectId={projectId}
      initialDocs={planningDocs}
      initialInterviewMessages={interviewMessages}
    />
  );
}
