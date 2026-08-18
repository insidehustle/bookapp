"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { encrypt } from "@/lib/crypto";

const apiKeySchema = z
  .string()
  .trim()
  .min(10, "That doesn't look like a valid Gemini API key.")
  .max(200);

export async function saveGeminiApiKey(formData: FormData) {
  const userId = await requireUserId();
  const result = apiKeySchema.safeParse(formData.get("apiKey"));
  if (!result.success) {
    redirect(`/account?error=${encodeURIComponent(result.error.issues[0]?.message ?? "Invalid API key.")}`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { geminiApiKey: encrypt(result.data) },
  });

  revalidatePath("/account");
}

export async function clearGeminiApiKey() {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { geminiApiKey: null },
  });
  revalidatePath("/account");
}
