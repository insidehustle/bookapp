import { getOwnedProject, requireUserId } from "@/lib/authz";
import { BrainstormPanel } from "./BrainstormPanel";

export default async function BrainstormPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  return <BrainstormPanel projectId={projectId} />;
}
