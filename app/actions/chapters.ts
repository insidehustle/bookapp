"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOwnedProject, requireUserId } from "@/lib/authz";

export async function createChapter(projectId: string) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const last = await prisma.chapter.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? 0) + 1;

  const chapter = await prisma.chapter.create({
    data: { projectId, order, title: `Chapter ${order}`, content: "" },
  });

  redirect(`/projects/${projectId}/chapters/${chapter.id}`);
}

/**
 * Same chapter-creation logic as createChapter, but returns the created
 * chapter instead of redirecting - used by client-driven flows (like
 * writing the whole book) that create chapters in a loop without navigating.
 */
export async function createChapterSilent(projectId: string) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const last = await prisma.chapter.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? 0) + 1;

  const chapter = await prisma.chapter.create({
    data: { projectId, order, title: `Chapter ${order}`, content: "" },
  });

  revalidatePath(`/projects/${projectId}`);
  return chapter;
}

export async function deleteChapter(projectId: string, chapterId: string) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId } });
  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  await prisma.chapter.delete({ where: { id: chapterId } });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function undoChapterContent(projectId: string, chapterId: string) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId } });
  if (!chapter || chapter.previousContent === null) {
    throw new Error("Nothing to undo.");
  }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      content: chapter.previousContent,
      previousContent: null,
      wordCount: chapter.previousContent.split(/\s+/).filter(Boolean).length,
    },
  });

  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function updateChapterContent(projectId: string, chapterId: string, content: string) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId } });
  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { content, wordCount: content.split(/\s+/).filter(Boolean).length },
  });

  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
}
