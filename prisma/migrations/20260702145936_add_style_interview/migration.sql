-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterEnum
ALTER TYPE "PlanningDocType" ADD VALUE 'STYLE_BRIEF';

-- CreateTable
CREATE TABLE "StyleInterviewMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StyleInterviewMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StyleInterviewMessage_projectId_createdAt_idx" ON "StyleInterviewMessage"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "StyleInterviewMessage" ADD CONSTRAINT "StyleInterviewMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
