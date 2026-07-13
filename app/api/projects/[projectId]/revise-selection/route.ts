import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { reviseSelection } from "@/lib/claude/reviseSelection";
import { ClaudeRefusalError, ClaudeTruncatedError } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  planningDocId: z.string(),
  selectedText: z.string().min(1),
  instruction: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const { planningDocId, selectedText, instruction } = bodySchema.parse(await req.json());

  const doc = await prisma.planningDocument.findFirst({
    where: { id: planningDocId, projectId },
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!doc.content.includes(selectedText)) {
    return NextResponse.json(
      { error: "Selected text no longer matches the current content — reload and try again." },
      { status: 409 },
    );
  }

  try {
    const replacement = await reviseSelection({
      fullContext: doc.content,
      selectedText,
      instruction,
    });
    return NextResponse.json({ replacement });
  } catch (error) {
    if (error instanceof ClaudeRefusalError || error instanceof ClaudeTruncatedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
