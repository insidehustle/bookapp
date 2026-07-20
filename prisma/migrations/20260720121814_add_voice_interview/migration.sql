-- CreateTable
CREATE TABLE "VoiceInterviewMessage" (
    "id" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceInterviewMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceInterviewMessage_voiceId_createdAt_idx" ON "VoiceInterviewMessage"("voiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "VoiceInterviewMessage" ADD CONSTRAINT "VoiceInterviewMessage_voiceId_fkey" FOREIGN KEY ("voiceId") REFERENCES "Voice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
