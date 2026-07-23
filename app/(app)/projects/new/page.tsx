import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const userId = await requireUserId();
  const voices = await prisma.voice.findMany({ where: { userId }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">New project</h1>
      <Card>
        {error && <p className="mb-4 text-sm text-danger">{error}</p>}
        <form action={createProject} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Title
            <input name="title" required maxLength={200} className="rounded-lg px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Genre
            <input name="genre" maxLength={120} className="rounded-lg px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Premise
            <textarea name="premise" rows={5} maxLength={4000} className="rounded-lg px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Target word count
            <input
              type="number"
              name="targetWordCount"
              min={1000}
              className="rounded-lg px-3 py-2"
            />
          </label>
          {voices.length > 0 && (
            <label className="flex flex-col gap-1 text-sm text-muted">
              Voice
              <select name="voiceId" defaultValue="__none__" className="rounded-lg px-3 py-2">
                <option value="__none__">No voice</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">
                Optional - can also be set later from Project Settings.{" "}
                <Link href="/voices" className="text-accent hover:underline">
                  Manage voices
                </Link>
              </span>
            </label>
          )}
          <Button type="submit" className="mt-2">
            Create project
          </Button>
        </form>
      </Card>
    </div>
  );
}
