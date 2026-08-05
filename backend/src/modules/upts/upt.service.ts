import type { UPT } from "@prisma/client";

import type { AuditRepository } from "../shared/audit.repository.js";
import { AppError } from "../../middleware/error.js";
import type { UPTCreate } from "@simpatik/contracts";
import type { UptRepository } from "./upt.repository.js";

export class UptService {
  constructor(
    private readonly repository: UptRepository,
    private readonly audit: AuditRepository,
  ) {}

  async list(input: {
    page: number;
    pageSize: number;
    search?: string | undefined;
    active?: boolean | undefined;
    uptScopeId?: string | undefined;
  }) {
    return this.repository.list({
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      search: input.search,
      active: input.active,
      uptScopeId: input.uptScopeId,
    });
  }

  async create(input: UPTCreate, actorId: string): Promise<UPT> {
    const item = await this.repository.create(input);
    await this.audit.write({
      actorId,
      action: "UPT_CREATED",
      entityType: "UPT",
      entityId: item.id,
      metadata: { code: item.code },
    });
    return item;
  }

  async update(
    id: string,
    input: Partial<UPTCreate>,
    actorId: string,
    action = "UPT_UPDATED",
  ): Promise<UPT> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "UPT tidak ditemukan.");
    const item = await this.repository.update(id, input);
    await this.audit.write({
      actorId,
      action,
      entityType: "UPT",
      entityId: id,
      metadata: { active: item.active },
    });
    return item;
  }
}
