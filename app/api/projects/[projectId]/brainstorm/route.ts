import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnedProject, requireUserId } from "@/lib/authz";
import { generateBrainstorm } from "@/lib/claude/generateBrainstorm";
import { toApiErrorResponse } from "@/lib/claude/errors";

export const runtime = "nodejs";

const bodySchema = z.object({
  prompt: z.string().min(1).max(500),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const userId = await requireUserId();
  const project = await getOwnedProject(projectId, userId);

  const { prompt } = bodySchema.parse(await req.json());

  try {
    const brainstorm = await generateBrainstorm({
      prompt,
      projectTitle: project.title,
      genre: project.genre,
    });
    return NextResponse.json({ brainstorm });
  } catch (error) {
    const { message, status } = toApiErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
