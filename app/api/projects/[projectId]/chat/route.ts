import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { streamChatTurn } from "@/lib/claude/streamChat";
import { classifyStopReason, encodeStreamTrailer } from "@/lib/claude/errors";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const body = await req.json();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return new Response(JSON.stringify({ error: "Message is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [planningDocs, history, chapters, firstFile] = await Promise.all([
    prisma.planningDocument.findMany({ where: { projectId } }),
    prisma.chatMessage.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.chapter.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
    prisma.manuscriptFile.findFirst({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  const manuscriptExcerpt =
    chapters.length > 0
      ? chapters.map((chapter) => chapter.content).join("\n\n").slice(0, 8000)
      : firstFile
        ? firstFile.extractedText.slice(0, 8000)
        : null;

  const userMessage = await prisma.chatMessage.create({
    data: { projectId, role: "USER", content: message },
  });

  let full = "";
  let lastChunk: { candidates?: Array<{ finishReason?: string | null }> | null } | null = null;
  const encoder = new TextEncoder();
  const body_ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await streamChatTurn({
          projectTitle: project.title,
          premise: project.premise,
          genre: project.genre,
          planningDocs,
          manuscriptExcerpt,
          history: [...history, userMessage],
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
          await prisma.chatMessage.create({
            data: { projectId, role: "ASSISTANT", content: full },
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
