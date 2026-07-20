import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedVoice } from "@/lib/authz";
import { streamVoiceInterviewTurn } from "@/lib/claude/streamVoiceInterview";
import { classifyStopReason, encodeStreamTrailer } from "@/lib/claude/errors";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await params;
  const userId = await requireUserId();
  const voice = await getOwnedVoice(voiceId, userId);

  const body = await req.json();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return new Response(JSON.stringify({ error: "Message is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const history = await prisma.voiceInterviewMessage.findMany({
    where: { voiceId },
    orderBy: { createdAt: "asc" },
  });

  const userMessage = await prisma.voiceInterviewMessage.create({
    data: { voiceId, role: "USER", content: message },
  });

  let full = "";
  let lastChunk: { candidates?: Array<{ finishReason?: string | null }> | null } | null = null;
  const encoder = new TextEncoder();
  const body_ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await streamVoiceInterviewTurn({
          voiceName: voice.name,
          voiceDescription: voice.description,
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
          await prisma.voiceInterviewMessage.create({
            data: { voiceId, role: "ASSISTANT", content: full },
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
