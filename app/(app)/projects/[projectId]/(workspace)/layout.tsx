import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { ChatPanel } from "./ChatPanel";
import { WorkspaceShell } from "./WorkspaceShell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const [chapters, chatMessages] = await Promise.all([
    prisma.chapter.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
    prisma.chatMessage.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <WorkspaceShell
      projectTitle={project.title}
      projectStatus={project.status}
      sidebar={<WorkspaceSidebar key="sidebar" projectId={projectId} chapters={chapters} />}
      chat={<ChatPanel key="chat" projectId={projectId} initialMessages={chatMessages} />}
    >
      {children}
    </WorkspaceShell>
  );
}
