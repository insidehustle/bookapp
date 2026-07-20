import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";

export const runtime = "nodejs";

const importSchema = z.object({
  formatVersion: z.literal(1),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  data: z.record(z.string(), z.unknown()),
  content: z.string(),
  samples: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        content: z.string(),
        source: z.enum(["MANUAL", "SAVED_FROM_CHAPTER"]).optional(),
      }),
    )
    .optional(),
});

export async function POST(req: Request) {
  const userId = await requireUserId();

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  let parsed: z.infer<typeof importSchema>;
  try {
    const text = await file.text();
    parsed = importSchema.parse(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { error: "That file isn't a valid exported voice." },
      { status: 400 },
    );
  }

  const voice = await prisma.voice.create({
    data: {
      userId,
      name: parsed.name,
      description: parsed.description ?? null,
      data: parsed.data as Prisma.InputJsonValue,
      content: parsed.content,
      samples: {
        create: (parsed.samples ?? []).map((sample) => ({
          label: sample.label,
          content: sample.content,
          source: sample.source ?? "MANUAL",
        })),
      },
    },
  });

  return NextResponse.json({ voice });
}
