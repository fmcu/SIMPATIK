import type { Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.types.js";
import { sendData } from "../shared/http.js";
import type { DashboardFilters } from "./dashboard.repository.js";
import type { DashboardQuery } from "./dashboard.schema.js";
import type { DashboardService } from "./dashboard.service.js";

function filtersFromQuery(query: DashboardQuery): DashboardFilters {
  return {
    ...(query.periodId ? { periodId: query.periodId } : {}),
    ...(query.uptId ? { uptId: query.uptId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.reportType ? { reportType: query.reportType } : {}),
  };
}

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  summary = async (request: Request, response: Response): Promise<void> => {
    const query = request.query as unknown as DashboardQuery;
    const scope = (request as AuthRequest).uptScopeId;
    sendData(
      response,
      await this.service.summary({
        ...filtersFromQuery(query),
        ...(scope ? { uptScopeId: scope } : {}),
      }),
    );
  };

  byUpt = async (request: Request, response: Response): Promise<void> => {
    const query = request.query as unknown as DashboardQuery;
    const scope = (request as AuthRequest).uptScopeId;
    sendData(
      response,
      await this.service.byUpt({
        ...filtersFromQuery(query),
        ...(scope ? { uptScopeId: scope } : {}),
      }),
    );
  };
}
