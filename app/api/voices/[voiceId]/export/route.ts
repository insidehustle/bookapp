import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedVoice } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await params;
  const userId = await requireUserId();
  const voice = await getOwnedVoice(voiceId, userId);

  const samples = await prisma.voiceSample.findMany({
    where: { voiceId },
    orderBy: { createdAt: "asc" },
  });

  const payload = {
    formatVersion: 1,
    name: voice.name,
    description: voice.description,
    data: voice.data,
    content: voice.content,
    samples: samples.map((sample) => ({
      label: sample.label,
      content: sample.content,
      source: sample.source,
    })),
  };

  const filename = `${voice.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "voice"}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
