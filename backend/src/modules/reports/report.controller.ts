import type { Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.types.js";
import { AppError } from "../../middleware/error.js";
import { paginationMeta, routeParam, sendData } from "../shared/http.js";
import type { ReportService } from "./report.service.js";

export class ReportController {
  constructor(private readonly service: ReportService) {}

  validateCompleteness = async (request: Request, response: Response): Promise<void> => {
    sendData(
      response,
      await this.service.validateCompleteness(
        routeParam(request, "id"),
        (request as AuthRequest).uptScopeId,
      ),
    );
  };

  submit = async (request: Request, response: Response): Promise<void> => {
    const authRequest = request as AuthRequest;
    const uptScopeId = authRequest.uptScopeId;
    if (!uptScopeId) {
      throw new AppError(403, "UPT_SCOPE_FORBIDDEN", "Akun belum memiliki penempatan UPT.");
    }
    sendData(
      response,
      await this.service.submit(routeParam(request, "id"), uptScopeId, authRequest.auth!.user.id),
    );
  };

  addReviewComment = async (request: Request, response: Response): Promise<void> => {
    sendData(
      response,
      await this.service.addReviewComment(
        routeParam(request, "id"),
        (request as AuthRequest).auth!.user.id,
        request.body.message,
      ),
    );
  };

  requestRevision = async (request: Request, response: Response): Promise<void> => {
    sendData(
      response,
      await this.service.requestRevision(
        routeParam(request, "id"),
        (request as AuthRequest).auth!.user.id,
        request.body.message,
      ),
    );
  };

  markReviewed = async (request: Request, response: Response): Promise<void> => {
    sendData(
      response,
      await this.service.markReviewed(
        routeParam(request, "id"),
        (request as AuthRequest).auth!.user.id,
      ),
    );
  };

  approve = async (request: Request, response: Response): Promise<void> => {
    sendData(
      response,
      await this.service.approve(routeParam(request, "id"), (request as AuthRequest).auth!.user.id),
    );
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const query = request.query as unknown as {
      page: number;
      pageSize: number;
      periodId?: string;
      uptId?: string;
      status?: "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "REVIEWED" | "APPROVED";
    };
    const result = await this.service.list({
      ...query,
      uptScopeId: (request as AuthRequest).uptScopeId,
    });
    sendData(response, result.items, paginationMeta(query.page, query.pageSize, result.total));
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const authRequest = request as AuthRequest;
    const uptId = authRequest.uptScopeId;
    if (!uptId) {
      throw new AppError(403, "UPT_SCOPE_FORBIDDEN", "Akun belum memiliki penempatan UPT.");
    }
    sendData(
      response,
      await this.service.create({
        periodId: request.body.periodId,
        reportType: request.body.reportType,
        uptId,
        actorId: authRequest.auth!.user.id,
      }),
    );
  };

  detail = async (request: Request, response: Response): Promise<void> => {
    sendData(
      response,
      await this.service.detail(routeParam(request, "id"), (request as AuthRequest).uptScopeId),
    );
  };

  history = async (request: Request, response: Response): Promise<void> => {
    const query = request.query as unknown as { page: number; pageSize: number };
    const result = await this.service.history(routeParam(request, "id"), {
      page: query.page,
      pageSize: query.pageSize,
      ...((request as AuthRequest).uptScopeId
        ? { uptScopeId: (request as AuthRequest).uptScopeId }
        : {}),
    });
    sendData(response, result.items, paginationMeta(query.page, query.pageSize, result.total));
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const authRequest = request as AuthRequest;
    const uptScopeId = authRequest.uptScopeId;
    if (!uptScopeId) {
      throw new AppError(403, "UPT_SCOPE_FORBIDDEN", "Akun belum memiliki penempatan UPT.");
    }
    sendData(
      response,
      await this.service.update(routeParam(request, "id"), {
        version: request.body.version,
        items: request.body.items,
        uptScopeId,
        actorId: authRequest.auth!.user.id,
      }),
    );
  };
}
