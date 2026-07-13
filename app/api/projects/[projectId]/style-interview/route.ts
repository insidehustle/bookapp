import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { streamStyleInterviewTurn } from "@/lib/claude/streamStyleInterview";
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

  const [planningDocs, history, firstFile] = await Promise.all([
    prisma.planningDocument.findMany({ where: { projectId } }),
    prisma.styleInterviewMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.manuscriptFile.findFirst({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  const userMessage = await prisma.styleInterviewMessage.create({
    data: { projectId, role: "USER", content: message },
  });

  let full = "";
  let lastChunk: { candidates?: Array<{ finishReason?: string | null }> | null } | null = null;
  const encoder = new TextEncoder();
  const body_ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await streamStyleInterviewTurn({
          projectTitle: project.title,
          premise: project.premise,
          genre: project.genre,
          planningDocs,
          manuscriptExcerpt: firstFile ? firstFile.extractedText.slice(0, 4000) : null,
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
          await prisma.styleInterviewMessage.create({
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
