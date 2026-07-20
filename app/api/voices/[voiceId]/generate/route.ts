import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedVoice } from "@/lib/authz";
import { generateVoiceBrain } from "@/lib/claude/generateVoiceBrain";
import { renderPlanningDocMarkdown } from "@/lib/claude/schemas";
import { applyVoiceBrainUpdate } from "@/app/actions/voices";
import { toApiErrorResponse } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  sampleIds: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await params;
  const userId = await requireUserId();
  const voice = await getOwnedVoice(voiceId, userId);

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => ({})));
  const sampleIds = parsedBody.success ? parsedBody.data.sampleIds : undefined;
  const notes = parsedBody.success ? parsedBody.data.notes : undefined;

  const samples = await prisma.voiceSample.findMany({
    where: { voiceId, ...(sampleIds ? { id: { in: sampleIds } } : {}) },
    orderBy: { createdAt: "asc" },
  });

  try {
    const brain = await generateVoiceBrain({
      name: voice.name,
      description: voice.description,
      existingBrainContent: voice.content || null,
      samples: samples.map((sample) => ({ label: sample.label, content: sample.content })),
      userNotes: notes || null,
    });

    const content = renderPlanningDocMarkdown(brain);
    const updated = await applyVoiceBrainUpdate(voiceId, {
      content,
      data: brain as Prisma.InputJsonValue,
      note: "Regenerated with AI",
    });

    return NextResponse.json({ voice: updated });
  } catch (error) {
    const { message, status } = toApiErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
