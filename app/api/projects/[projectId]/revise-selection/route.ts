import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { reviseSelection } from "@/lib/claude/reviseSelection";
import { renderReferenceFilesBlock } from "@/lib/claude/promptBuilder";
import { toApiErrorResponse } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    planningDocId: z.string().optional(),
    chapterId: z.string().optional(),
    selectedText: z.string().min(1),
    instruction: z.string().min(1).max(2000),
    fileIds: z.array(z.string()).optional(),
  })
  .refine((data) => Boolean(data.planningDocId) !== Boolean(data.chapterId), {
    message: "Provide exactly one of planningDocId or chapterId.",
  });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const { planningDocId, chapterId, selectedText, instruction, fileIds } = bodySchema.parse(
    await req.json(),
  );

  const [source, referenceFiles, voice] = await Promise.all([
    planningDocId
      ? prisma.planningDocument.findFirst({ where: { id: planningDocId, projectId } })
      : prisma.chapter.findFirst({ where: { id: chapterId, projectId } }),
    fileIds && fileIds.length > 0
      ? prisma.manuscriptFile.findMany({ where: { projectId, id: { in: fileIds } } })
      : Promise.resolve([]),
    project.voiceId ? prisma.voice.findUnique({ where: { id: project.voiceId } }) : Promise.resolve(null),
  ]);

  if (!source) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const replacement = await reviseSelection({
      fullContext: source.content,
      selectedText,
      instruction,
      referenceFilesText: renderReferenceFilesBlock(referenceFiles) || null,
      voiceContent: voice?.content ?? null,
    });
    return NextResponse.json({ replacement });
  } catch (error) {
    const { message, status } = toApiErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
