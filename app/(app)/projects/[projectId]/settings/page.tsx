import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { updateProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);
  const voices = await prisma.voice.findMany({ where: { userId }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-8">
      <Link
        href={`/projects/${projectId}`}
        className="w-fit text-xs text-muted transition-colors hover:text-accent"
      >
        ← Back to {project.title}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Project Settings</h1>
        <Badge>{project.status}</Badge>
      </div>
      <p className="text-sm text-muted">
        This is what you filled in when you created the project - edit any of it and save.
      </p>

      <Card>
        {error && <p className="mb-4 text-sm text-danger">{error}</p>}
        <form action={updateProject.bind(null, projectId)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Title
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={project.title}
              className="rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Genre
            <input
              name="genre"
              maxLength={120}
              defaultValue={project.genre ?? ""}
              className="rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Premise
            <textarea
              name="premise"
              rows={5}
              maxLength={4000}
              defaultValue={project.premise ?? ""}
              className="rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Target word count
            <input
              type="number"
              name="targetWordCount"
              min={1000}
              defaultValue={project.targetWordCount ?? ""}
              className="rounded-lg px-3 py-2"
            />
            <span className="text-xs text-muted">
              Used by &quot;Write the whole book&quot; to know when the manuscript is done.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Voice
            <select
              name="voiceId"
              defaultValue={project.voiceId ?? "__none__"}
              className="rounded-lg px-3 py-2"
            >
              <option value="__none__">No voice</option>
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              When set, this voice&apos;s style guidelines take priority over everything else
              when drafting, rewriting, or revising chapters.{" "}
              <Link href="/voices" className="text-accent hover:underline">
                Manage voices
              </Link>
            </span>
          </label>
          <Button type="submit" className="mt-2 w-fit">
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
