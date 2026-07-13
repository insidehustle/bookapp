-- CreateTable
CREATE TABLE "ManuscriptFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManuscriptFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManuscriptFile_projectId_createdAt_idx" ON "ManuscriptFile"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManuscriptFile" ADD CONSTRAINT "ManuscriptFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
