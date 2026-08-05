-- AlterTable
ALTER TABLE "Project" DROP COLUMN "targetWordCount",
ADD COLUMN     "targetChapterCount" INTEGER,
ADD COLUMN     "targetWordsPerChapter" INTEGER;
