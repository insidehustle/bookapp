import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, getOwnedVoice } from "@/lib/authz";
import { reviseSelection } from "@/lib/claude/reviseSelection";
import { toApiErrorResponse } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  selectedText: z.string().min(1),
  instruction: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await params;
  const userId = await requireUserId();
  const voice = await getOwnedVoice(voiceId, userId);

  const { selectedText, instruction } = bodySchema.parse(await req.json());

  try {
    const replacement = await reviseSelection({
      fullContext: voice.content,
      selectedText,
      instruction,
    });
    return NextResponse.json({ replacement });
  } catch (error) {
    const { message, status } = toApiErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
