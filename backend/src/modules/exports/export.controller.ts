import type { Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.types.js";
import { AppError } from "../../middleware/error.js";
import type { DashboardFilters } from "../dashboard/dashboard.repository.js";
import type { DashboardQuery } from "../dashboard/dashboard.schema.js";
import type { DashboardService } from "../dashboard/dashboard.service.js";
import { renderReportsCsv } from "./report-csv.service.js";

function filtersFromQuery(query: DashboardQuery): DashboardFilters {
  return {
    ...(query.periodId ? { periodId: query.periodId } : {}),
    ...(query.uptId ? { uptId: query.uptId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.reportType ? { reportType: query.reportType } : {}),
  };
}

export class ExportController {
  constructor(private readonly service: DashboardService) {}

  reportsCsv = async (request: Request, response: Response): Promise<void> => {
    const authRequest = request as AuthRequest;
    const actor = authRequest.auth?.user;
    if (!actor) throw new AppError(401, "AUTHENTICATION_REQUIRED", "Sesi login diperlukan.");
    const query = request.query as unknown as DashboardQuery;
    const result = await this.service.exportReports({
      ...filtersFromQuery(query),
      ...(authRequest.uptScopeId ? { uptScopeId: authRequest.uptScopeId } : {}),
      actorId: actor.id,
    });
    const csv = renderReportsCsv({
      periodId: result.period.id,
      periodName: result.period.name,
      filters: result.filters,
      exportedAt: new Date(),
      actorName: actor.name,
      reports: result.reports,
    });
    response.status(200);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="reports.csv"');
    response.send(`\uFEFF${csv}`);
  };
}
