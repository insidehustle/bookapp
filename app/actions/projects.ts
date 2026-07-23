"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedProject } from "@/lib/authz";

// The voice <select>'s "No voice" option posts this sentinel rather than an
// empty string, so it can be distinguished from "field left untouched" (see
// the `|| undefined` pattern every other field here uses) and actually
// clears Project.voiceId instead of leaving the previous value in place.
const NO_VOICE_SENTINEL = "__none__";

function parseVoiceIdField(formData: FormData): string | null | undefined {
  const raw = formData.get("voiceId");
  if (raw === NO_VOICE_SENTINEL) return null;
  if (typeof raw === "string" && raw) return raw;
  return undefined;
}

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  premise: z.string().max(4000).optional(),
  genre: z.string().max(120).optional(),
  targetWordCount: z.coerce.number().int().positive().optional(),
});

// Turns the first Zod issue into a short, author-facing message instead of
// letting a ZodError escape the action uncaught - form actions have no
// try/catch boundary of their own, so an uncaught throw here crashes the
// whole request into Next's generic "Application error" page.
function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message || fallback;
}

export async function createProject(formData: FormData) {
  const userId = await requireUserId();
  const result = createProjectSchema.safeParse({
    title: formData.get("title"),
    premise: formData.get("premise") || undefined,
    genre: formData.get("genre") || undefined,
    targetWordCount: formData.get("targetWordCount") || undefined,
  });
  if (!result.success) {
    redirect(`/projects/new?error=${encodeURIComponent(firstIssueMessage(result.error, "Please check the form and try again."))}`);
  }
  const voiceId = parseVoiceIdField(formData);

  const project = await prisma.project.create({
    data: { ...result.data, userId, voiceId: voiceId ?? null },
  });

  redirect(`/projects/${project.id}`);
}

const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  premise: z.string().max(4000).optional(),
  genre: z.string().max(120).optional(),
  targetWordCount: z.coerce.number().int().positive().optional(),
});

export async function updateProject(projectId: string, formData: FormData) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  const result = updateProjectSchema.safeParse({
    title: formData.get("title") || undefined,
    premise: formData.get("premise") || undefined,
    genre: formData.get("genre") || undefined,
    targetWordCount: formData.get("targetWordCount") || undefined,
  });
  if (!result.success) {
    redirect(
      `/projects/${projectId}/settings?error=${encodeURIComponent(firstIssueMessage(result.error, "Please check the form and try again."))}`,
    );
  }
  const voiceId = parseVoiceIdField(formData);

  await prisma.project.update({
    where: { id: projectId },
    data: { ...result.data, ...(voiceId !== undefined ? { voiceId } : {}) },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath("/projects");
}

export async function deleteProject(projectId: string) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
  redirect("/projects");
}
