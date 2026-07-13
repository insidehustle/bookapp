import Link from "next/link";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { Badge } from "@/components/ui/Badge";
import { ProjectSidebarNav } from "./ProjectSidebarNav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-7xl">
      <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-border px-4 py-6">
        <div>
          <Link
            href="/projects"
            className="mb-3 inline-block text-xs text-muted transition-colors hover:text-accent"
          >
            ← All projects
          </Link>
          <h1 className="truncate text-lg font-semibold">{project.title}</h1>
          <Badge className="mt-2">{project.status}</Badge>
        </div>
        <ProjectSidebarNav projectId={projectId} />
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
