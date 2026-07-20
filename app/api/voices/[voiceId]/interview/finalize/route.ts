import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedVoice } from "@/lib/authz";
import { generateVoiceBrain } from "@/lib/claude/generateVoiceBrain";
import { renderPlanningDocMarkdown } from "@/lib/claude/schemas";
import { applyVoiceBrainUpdate } from "@/app/actions/voices";
import { toApiErrorResponse } from "@/lib/claude/errors";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await params;
  const userId = await requireUserId();
  const voice = await getOwnedVoice(voiceId, userId);

  const transcript = await prisma.voiceInterviewMessage.findMany({
    where: { voiceId },
    orderBy: { createdAt: "asc" },
  });

  if (transcript.length === 0) {
    return NextResponse.json({ error: "No interview conversation yet." }, { status: 400 });
  }

  const transcriptText = transcript
    .map((message) => `${message.role === "USER" ? "Author" : "Coach"}: ${message.content}`)
    .join("\n\n");

  try {
    const brain = await generateVoiceBrain({
      name: voice.name,
      description: voice.description,
      existingBrainContent: voice.content || null,
      samples: [],
      interviewTranscript: transcriptText,
    });

    const content = renderPlanningDocMarkdown(brain);
    const updated = await applyVoiceBrainUpdate(voiceId, {
      content,
      data: brain as Prisma.InputJsonValue,
      note: "Finalized from interview",
    });

    return NextResponse.json({ voice: updated });
  } catch (error) {
    const { message, status } = toApiErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
