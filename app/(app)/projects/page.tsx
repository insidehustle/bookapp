import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function ProjectsPage() {
  const userId = await requireUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your projects</h1>
        <Link href="/projects/new">
          <Button>New project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-sm text-muted">
          No projects yet. Create one to get started.
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}/files`}>
                <Card className="flex items-center justify-between transition-colors hover:border-accent">
                  <div>
                    <div className="font-medium">{project.title}</div>
                    <div className="text-xs text-muted">{project.genre ?? "No genre set"}</div>
                  </div>
                  <Badge>{project.status}</Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
