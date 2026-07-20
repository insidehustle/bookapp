import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { streamChapterRewrite } from "@/lib/claude/streamChapterRewrite";
import { renderReferenceFilesBlock } from "@/lib/claude/promptBuilder";
import { classifyStopReason, encodeStreamTrailer } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  instruction: z.string().min(1).max(2000),
  fileIds: z.array(z.string()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; chapterId: string }> },
) {
  const { projectId, chapterId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "An instruction is required." }, { status: 400 });
  }
  const { instruction, fileIds } = parsedBody.data;

  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId } });
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }
  if (!chapter.content.trim()) {
    return NextResponse.json(
      { error: "This chapter has no content yet - use Write to draft it first." },
      { status: 400 },
    );
  }

  const [planningDocs, otherChapters, referenceFiles, voice] = await Promise.all([
    prisma.planningDocument.findMany({ where: { projectId } }),
    prisma.chapter.findMany({
      where: { projectId, id: { not: chapterId } },
      orderBy: { order: "asc" },
    }),
    fileIds && fileIds.length > 0
      ? prisma.manuscriptFile.findMany({ where: { projectId, id: { in: fileIds } } })
      : Promise.resolve([]),
    project.voiceId ? prisma.voice.findUnique({ where: { id: project.voiceId } }) : Promise.resolve(null),
  ]);

  let full = "";
  let lastChunk: { candidates?: Array<{ finishReason?: string | null }> | null } | null = null;
  const encoder = new TextEncoder();
  const body_ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await streamChapterRewrite({
          projectTitle: project.title,
          premise: project.premise,
          genre: project.genre,
          planningDocs,
          otherChapters,
          chapterOrder: chapter.order,
          chapterTitle: chapter.title,
          currentContent: chapter.content,
          instruction,
          referenceFilesText: renderReferenceFilesBlock(referenceFiles) || null,
          voice: voice ? { name: voice.name, content: voice.content } : null,
        });

        for await (const chunk of stream) {
          lastChunk = chunk;
          const delta = chunk.text ?? "";
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }

        const outcome = lastChunk ? classifyStopReason(lastChunk) : { type: "ok" as const };
        if (outcome.type === "ok" && full.trim()) {
          await prisma.chapter.update({
            where: { id: chapterId },
            data: {
              previousContent: chapter.content,
              content: full,
              status: "EDITING",
              wordCount: full.split(/\s+/).filter(Boolean).length,
              lastInstruction: instruction,
            },
          });
        } else if (outcome.type !== "ok") {
          controller.enqueue(encoder.encode(encodeStreamTrailer(outcome)));
        }
      } catch (error) {
        controller.error(error);
        return;
      }
      controller.close();
    },
  });

  return new Response(body_, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
