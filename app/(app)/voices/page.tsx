import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VoiceLibraryList } from "./VoiceLibraryList";
import { ImportVoiceForm } from "./ImportVoiceForm";

export default async function VoicesPage() {
  const userId = await requireUserId();
  const voices = await prisma.voice.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { samples: true } } },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your voices</h1>
        <Link href="/voices/new">
          <Button>New voice</Button>
        </Link>
      </div>
      <p className="text-sm text-muted">
        A voice is a reusable writing style you can attach to any project — create it once,
        write in it across as many books as you like.
      </p>

      {voices.length === 0 ? (
        <Card className="text-sm text-muted">
          No voices yet. Create one to get started.
        </Card>
      ) : (
        <VoiceLibraryList voices={voices} />
      )}

      <ImportVoiceForm />
    </div>
  );
}
