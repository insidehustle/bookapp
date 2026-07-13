import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NewProjectPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">New project</h1>
      <Card>
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
          <Button type="submit" className="mt-2">
            Create project
          </Button>
        </form>
      </Card>
    </div>
  );
}
