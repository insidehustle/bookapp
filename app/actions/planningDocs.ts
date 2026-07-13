"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";

export async function updatePlanningDocContent(
  projectId: string,
  docId: string,
  content: string,
) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const doc = await prisma.planningDocument.findFirst({
    where: { id: docId, projectId },
  });
  if (!doc) {
    throw new Error("Planning document not found.");
  }

  await prisma.planningDocument.update({ where: { id: docId }, data: { content } });
  revalidatePath(`/projects/${projectId}/planning`);
}
