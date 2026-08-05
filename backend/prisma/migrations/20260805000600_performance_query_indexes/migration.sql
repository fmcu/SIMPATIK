CREATE INDEX "Report_uptId_status_updatedAt_idx" ON "Report"("uptId", "status", "updatedAt");
CREATE INDEX "Report_periodId_status_updatedAt_idx" ON "Report"("periodId", "status", "updatedAt");
CREATE INDEX "Report_periodId_uptId_updatedAt_idx" ON "Report"("periodId", "uptId", "updatedAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
