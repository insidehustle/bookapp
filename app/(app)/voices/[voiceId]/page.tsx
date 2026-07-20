import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId, getOwnedVoice } from "@/lib/authz";
import { VoiceBrainEditor } from "./VoiceBrainEditor";

export default async function VoicePage({
  params,
}: {
  params: Promise<{ voiceId: string }>;
}) {
  const { voiceId } = await params;
  const userId = await requireUserId();
  const voice = await getOwnedVoice(voiceId, userId);

  const [samples, versions, interviewMessages] = await Promise.all([
    prisma.voiceSample.findMany({ where: { voiceId }, orderBy: { createdAt: "asc" } }),
    prisma.voiceVersion.findMany({ where: { voiceId }, orderBy: { version: "desc" } }),
    prisma.voiceInterviewMessage.findMany({ where: { voiceId }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <Link
        href="/voices"
        className="w-fit text-xs text-muted transition-colors hover:text-accent"
      >
        ← All voices
      </Link>
      <h1 className="text-2xl font-semibold">{voice.name}</h1>
      <VoiceBrainEditor
        voice={voice}
        samples={samples}
        versions={versions}
        interviewMessages={interviewMessages}
      />
    </div>
  );
}
