ALTER TABLE "Report" ADD COLUMN "reviewedById" TEXT;

CREATE INDEX "Report_reviewedById_idx" ON "Report"("reviewedById");

ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
