CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "ReportingPeriod" ADD COLUMN "configurationVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Indicator"
  ADD COLUMN "inputConfig" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

CREATE TABLE "RequiredDocument" (
  "id" TEXT NOT NULL,
  "periodId" TEXT,
  "indicatorId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "allowedMimeTypes" TEXT[] NOT NULL,
  "maxSize" INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  CONSTRAINT "RequiredDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Attachment" ADD COLUMN "requirementId" TEXT;

CREATE UNIQUE INDEX "RequiredDocument_periodId_code_key" ON "RequiredDocument"("periodId", "code");
CREATE UNIQUE INDEX "RequiredDocument_indicatorId_code_key" ON "RequiredDocument"("indicatorId", "code");
CREATE INDEX "RequiredDocument_periodId_order_idx" ON "RequiredDocument"("periodId", "order");
CREATE INDEX "RequiredDocument_indicatorId_order_idx" ON "RequiredDocument"("indicatorId", "order");
CREATE INDEX "RequiredDocument_approvalStatus_idx" ON "RequiredDocument"("approvalStatus");
CREATE INDEX "Indicator_approvalStatus_idx" ON "Indicator"("approvalStatus");
CREATE INDEX "Attachment_requirementId_idx" ON "Attachment"("requirementId");
CREATE UNIQUE INDEX "ReportingPeriod_one_active_idx" ON "ReportingPeriod" ("status") WHERE "status" = 'ACTIVE';
ALTER TABLE "RequiredDocument" ADD CONSTRAINT "RequiredDocument_exactly_one_target_check" CHECK ((CASE WHEN "periodId" IS NULL THEN 0 ELSE 1 END) + (CASE WHEN "indicatorId" IS NULL THEN 0 ELSE 1 END) = 1);

ALTER TABLE "Indicator" ADD CONSTRAINT "Indicator_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequiredDocument" ADD CONSTRAINT "RequiredDocument_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequiredDocument" ADD CONSTRAINT "RequiredDocument_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequiredDocument" ADD CONSTRAINT "RequiredDocument_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RequiredDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
