-- AlterTable
ALTER TABLE "StorageDeletionTask"
ADD COLUMN "repeatUntilCancelled" BOOLEAN NOT NULL DEFAULT false;
