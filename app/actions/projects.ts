"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedProject } from "@/lib/authz";

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  premise: z.string().max(4000).optional(),
  genre: z.string().max(120).optional(),
  targetWordCount: z.coerce.number().int().positive().optional(),
});

export async function createProject(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createProjectSchema.parse({
    title: formData.get("title"),
    premise: formData.get("premise") || undefined,
    genre: formData.get("genre") || undefined,
    targetWordCount: formData.get("targetWordCount") || undefined,
  });

  const project = await prisma.project.create({
    data: { ...parsed, userId },
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

  const parsed = updateProjectSchema.parse({
    title: formData.get("title") || undefined,
    premise: formData.get("premise") || undefined,
    genre: formData.get("genre") || undefined,
    targetWordCount: formData.get("targetWordCount") || undefined,
  });

  await prisma.project.update({
    where: { id: projectId },
    data: parsed,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  const userId = await requireUserId();
  await getOwnedProject(projectId, userId);

  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
  redirect("/projects");
}
