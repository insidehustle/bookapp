import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Project, Voice } from "@prisma/client";

/**
 * Every route/action that touches a Project (or a child of one) must resolve
 * the current user through this helper rather than trusting a raw ID from the
 * request — it's the single place that enforces per-user ownership.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getOwnedProject(
  projectId: string,
  userId: string,
): Promise<Project> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    notFound();
  }
  return project;
}

// Voice is the one resource in this app that isn't gated through a Project -
// it's scoped directly to the User so it can be reused across any number of
// books, so it gets its own ownership check rather than going through
// getOwnedProject.
export async function getOwnedVoice(voiceId: string, userId: string): Promise<Voice> {
  const voice = await prisma.voice.findFirst({
    where: { id: voiceId, userId },
  });
  if (!voice) {
    notFound();
  }
  return voice;
}
