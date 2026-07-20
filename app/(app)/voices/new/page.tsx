import { createVoice } from "@/app/actions/voices";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NewVoicePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">New voice</h1>
      <Card>
        <form action={createVoice} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Name
            <input
              name="name"
              required
              maxLength={200}
              placeholder="e.g. Hard-boiled Noir"
              className="rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Description
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="What does this voice sound like? Who or what is it inspired by?"
              className="rounded-lg px-3 py-2"
            />
          </label>
          <Button type="submit" className="mt-2">
            Create voice
          </Button>
        </form>
      </Card>
    </div>
  );
}
