import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedVoice } from "@/lib/authz";
import {
  FileTooLargeError,
  UnsupportedFileTypeError,
  parseUpload,
} from "@/lib/manuscript/parseUpload";

// mammoth/pdf-parse need Node.js APIs - not available on Edge.
export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await params;
  const userId = await requireUserId();
  await getOwnedVoice(voiceId, userId);

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await parseUpload(file);
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError || error instanceof FileTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  if (!parsed.text) {
    return NextResponse.json(
      { error: "No text could be extracted from that file." },
      { status: 400 },
    );
  }

  const sample = await prisma.voiceSample.create({
    data: {
      voiceId,
      label: parsed.filename,
      content: parsed.text,
      source: "MANUAL",
    },
  });

  return NextResponse.json({ sample });
}
