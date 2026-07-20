-- CreateEnum
CREATE TYPE "VoiceSampleSource" AS ENUM ('MANUAL', 'SAVED_FROM_CHAPTER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "voiceId" TEXT;

-- CreateTable
CREATE TABLE "Voice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceVersion" (
    "id" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSample" (
    "id" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" "VoiceSampleSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Voice_userId_idx" ON "Voice"("userId");

-- CreateIndex
CREATE INDEX "VoiceVersion_voiceId_createdAt_idx" ON "VoiceVersion"("voiceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceVersion_voiceId_version_key" ON "VoiceVersion"("voiceId", "version");

-- CreateIndex
CREATE INDEX "VoiceSample_voiceId_createdAt_idx" ON "VoiceSample"("voiceId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_voiceId_idx" ON "Project"("voiceId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_voiceId_fkey" FOREIGN KEY ("voiceId") REFERENCES "Voice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voice" ADD CONSTRAINT "Voice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceVersion" ADD CONSTRAINT "VoiceVersion_voiceId_fkey" FOREIGN KEY ("voiceId") REFERENCES "Voice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSample" ADD CONSTRAINT "VoiceSample_voiceId_fkey" FOREIGN KEY ("voiceId") REFERENCES "Voice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
