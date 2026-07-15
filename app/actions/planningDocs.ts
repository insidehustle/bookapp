"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, PlanningDocType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";

/**
 * Creates or updates a Story Bible doc directly from author-typed content -
 * no AI generation required. Keyed by (projectId, type), matching the
 * @@unique constraint, so it works whether or not a doc already exists yet.
 */
export async function saveStoryBibleContent(
  projectId: string,
  type: PlanningDocType,
  content: string,
) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const doc = await prisma.planningDocument.upsert({
    where: { projectId_type: { projectId, type } },
    create: { projectId, type, content, data: {} as Prisma.InputJsonValue },
    update: { content },
  });

  revalidatePath(`/projects/${projectId}/story-bible/${type}`);
  return doc;
}
