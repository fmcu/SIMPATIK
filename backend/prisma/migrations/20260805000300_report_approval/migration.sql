ALTER TABLE "Report" ADD COLUMN "approvedById" TEXT;

CREATE INDEX "Report_approvedById_idx" ON "Report"("approvedById");

ALTER TABLE "Report" ADD CONSTRAINT "Report_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
