"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedVoice, getOwnedProject } from "@/lib/authz";

const createVoiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
});

// Form actions have no try/catch boundary of their own - an uncaught
// ZodError crashes the whole request into Next's generic "Application
// error" page instead of showing the author a message, so every form
// action here uses safeParse and redirects back with ?error= on failure.
// Prefixing with the field name (issue.path) means a validation failure is
// diagnosable from the message alone, without needing server logs.
function firstIssueMessage(error: z.ZodError, fallback: string): string {
  const issue = error.issues[0];
  if (!issue) return fallback;
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

export async function createVoice(formData: FormData) {
  const userId = await requireUserId();
  const result = createVoiceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!result.success) {
    redirect(`/voices/new?error=${encodeURIComponent(firstIssueMessage(result.error, "Please check the form and try again."))}`);
  }

  const voice = await prisma.voice.create({
    data: { ...result.data, userId, data: {} as Prisma.InputJsonValue, content: "" },
  });

  redirect(`/voices/${voice.id}`);
}

const updateVoiceMetaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
});

export async function updateVoiceMeta(voiceId: string, formData: FormData) {
  const userId = await requireUserId();
  await getOwnedVoice(voiceId, userId);

  const result = updateVoiceMetaSchema.safeParse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!result.success) {
    redirect(
      `/voices/${voiceId}?error=${encodeURIComponent(firstIssueMessage(result.error, "Please check the form and try again."))}`,
    );
  }

  await prisma.voice.update({ where: { id: voiceId }, data: result.data });
  revalidatePath(`/voices/${voiceId}`);
  revalidatePath("/voices");
}

/**
 * Snapshots the voice's current data/content into VoiceVersion before
 * overwriting it, so every save (manual edit or AI regenerate) is
 * individually restorable. `data` is left untouched when omitted, since a
 * manual content-only edit shouldn't wipe the last AI-generated structured
 * fields - mirrors how saveStoryBibleContent only ever touches `content`.
 */
export async function applyVoiceBrainUpdate(
  voiceId: string,
  params: { content: string; data?: Prisma.InputJsonValue; note?: string },
) {
  const userId = await requireUserId();
  const current = await getOwnedVoice(voiceId, userId);

  await prisma.voiceVersion.create({
    data: {
      voiceId,
      version: current.version,
      data: current.data as Prisma.InputJsonValue,
      content: current.content,
      note: params.note ?? null,
    },
  });

  const updated = await prisma.voice.update({
    where: { id: voiceId },
    data: {
      content: params.content,
      ...(params.data !== undefined ? { data: params.data } : {}),
      version: { increment: 1 },
    },
  });

  // Bound version history so a heavily-edited voice can't grow unbounded.
  const versionCount = await prisma.voiceVersion.count({ where: { voiceId } });
  if (versionCount > 50) {
    const oldest = await prisma.voiceVersion.findFirst({
      where: { voiceId },
      orderBy: { version: "asc" },
    });
    if (oldest) {
      await prisma.voiceVersion.delete({ where: { id: oldest.id } });
    }
  }

  revalidatePath(`/voices/${voiceId}`);
  return updated;
}

export async function saveVoiceContent(voiceId: string, content: string) {
  return applyVoiceBrainUpdate(voiceId, { content });
}

export async function deleteVoice(voiceId: string) {
  const userId = await requireUserId();
  await getOwnedVoice(voiceId, userId);

  await prisma.voice.delete({ where: { id: voiceId } });

  revalidatePath("/voices");
  redirect("/voices");
}

export async function duplicateVoice(voiceId: string) {
  const userId = await requireUserId();
  const voice = await getOwnedVoice(voiceId, userId);
  const samples = await prisma.voiceSample.findMany({ where: { voiceId } });

  await prisma.voice.create({
    data: {
      userId,
      name: `${voice.name} (copy)`,
      description: voice.description,
      data: voice.data as Prisma.InputJsonValue,
      content: voice.content,
      samples: {
        create: samples.map((sample) => ({
          label: sample.label,
          content: sample.content,
          source: sample.source,
        })),
      },
    },
  });

  revalidatePath("/voices");
}

export async function restoreVoiceVersion(voiceId: string, versionId: string) {
  const userId = await requireUserId();
  await getOwnedVoice(voiceId, userId);

  const version = await prisma.voiceVersion.findFirst({ where: { id: versionId, voiceId } });
  if (!version) {
    throw new Error("Version not found.");
  }

  return applyVoiceBrainUpdate(voiceId, {
    content: version.content,
    data: version.data as Prisma.InputJsonValue,
    note: `Restored version ${version.version}`,
  });
}

const addVoiceSampleSchema = z.object({
  label: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function addVoiceSample(voiceId: string, formData: FormData) {
  const userId = await requireUserId();
  await getOwnedVoice(voiceId, userId);

  const parsed = addVoiceSampleSchema.parse({
    label: formData.get("label"),
    content: formData.get("content"),
  });

  await prisma.voiceSample.create({ data: { voiceId, ...parsed, source: "MANUAL" } });
  revalidatePath(`/voices/${voiceId}`);
}

export async function deleteVoiceSample(voiceId: string, sampleId: string) {
  const userId = await requireUserId();
  await getOwnedVoice(voiceId, userId);

  await prisma.voiceSample.deleteMany({ where: { id: sampleId, voiceId } });
  revalidatePath(`/voices/${voiceId}`);
}

export async function saveChapterAsVoiceSample(
  voiceId: string,
  projectId: string,
  chapterId: string,
) {
  const userId = await requireUserId();
  await Promise.all([getOwnedVoice(voiceId, userId), getOwnedProject(projectId, userId)]);

  const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId } });
  if (!chapter) {
    throw new Error("Chapter not found.");
  }
  if (!chapter.content.trim()) {
    throw new Error("This chapter has no content yet.");
  }

  await prisma.voiceSample.create({
    data: {
      voiceId,
      label: `Chapter ${chapter.order}: ${chapter.title}`,
      content: chapter.content,
      source: "SAVED_FROM_CHAPTER",
    },
  });

  revalidatePath(`/voices/${voiceId}`);
}
