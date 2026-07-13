import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const { projectId, fileId } = await params;
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const file = await prisma.manuscriptFile.findFirst({
    where: { id: fileId, projectId },
  });
  if (!file) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.manuscriptFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}
