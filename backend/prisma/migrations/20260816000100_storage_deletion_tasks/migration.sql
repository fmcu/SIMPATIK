-- CreateTable
CREATE TABLE "StorageDeletionTask" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageDeletionTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageDeletionTask_storageKey_key" ON "StorageDeletionTask"("storageKey");

-- CreateIndex
CREATE INDEX "StorageDeletionTask_nextAttemptAt_createdAt_idx" ON "StorageDeletionTask"("nextAttemptAt", "createdAt");
