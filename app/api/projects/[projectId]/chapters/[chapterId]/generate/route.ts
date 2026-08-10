import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { streamChapterDraft } from "@/lib/claude/streamChapterDraft";
import { generateChapterTitle } from "@/lib/claude/generateChapterTitle";
import { renderReferenceFilesBlock } from "@/lib/claude/promptBuilder";
import { classifyStopReason, encodeStreamTrailer, isRateLimitError } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  instruction: z.string().max(2000).optional(),
  fileIds: z.array(z.string()).optional(),
  targetWordCount: z.number().int().positive().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; chapterId: string }> },
) {
  const { projectId, chapterId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => ({})));
  const instruction = parsedBody.success ? (parsedBody.data.instruction ?? "").trim() : "";
  const fileIds = parsedBody.success ? parsedBody.data.fileIds : undefined;
  const targetWordCount = parsedBody.success ? parsedBody.data.targetWordCount : undefined;

  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId } });
  if (!chapter) {
    return new Response(JSON.stringify({ error: "Chapter not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [planningDocs, priorChapters, referenceFiles, voice] = await Promise.all([
    prisma.planningDocument.findMany({ where: { projectId } }),
    prisma.chapter.findMany({
      where: { projectId, order: { lt: chapter.order } },
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
        const stream = await streamChapterDraft({
          projectTitle: project.title,
          premise: project.premise,
          genre: project.genre,
          planningDocs,
          priorChapters,
          chapterOrder: chapter.order,
          chapterTitle: chapter.title,
          instruction: instruction || null,
          referenceFilesText: renderReferenceFilesBlock(referenceFiles) || null,
          targetWordCount: targetWordCount ?? null,
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
          // Only replace the placeholder title Prisma assigned at chapter
          // creation - never override a title the user already set.
          const isPlaceholderTitle = chapter.title === `Chapter ${chapter.order}`;
          let title: string | undefined;
          if (isPlaceholderTitle) {
            try {
              title = await generateChapterTitle({
                projectTitle: project.title,
                genre: project.genre,
                chapterOrder: chapter.order,
                content: full,
              });
            } catch {
              // Best-effort - keep the placeholder title if this fails.
            }
          }

          await prisma.chapter.update({
            where: { id: chapterId },
            data: {
              previousContent: chapter.content || null,
              content: full,
              ...(title ? { title } : {}),
              status: "DRAFTED",
              source: "AI_GENERATED",
              wordCount: full.split(/\s+/).filter(Boolean).length,
              lastInstruction: instruction || null,
            },
          });
          if (title) {
            controller.enqueue(encoder.encode(encodeStreamTrailer({ type: "ok", title })));
          }
          revalidatePath(`/projects/${projectId}`);
        } else if (outcome.type !== "ok") {
          controller.enqueue(encoder.encode(encodeStreamTrailer(outcome)));
        }
      } catch (error) {
        if (isRateLimitError(error)) {
          controller.enqueue(encoder.encode(encodeStreamTrailer({ type: "rate_limited" })));
        } else {
          console.error("AI request failed:", error);
          controller.enqueue(encoder.encode(encodeStreamTrailer({ type: "server_error" })));
        }
      }
      controller.close();
    },
  });

  return new Response(body_, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
