import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Role, User } from "@prisma/client";
import { roleSchema, type UserCreate } from "@simpatik/contracts";

import { AppError } from "../../middleware/error.js";
import type { AuditRepository } from "../shared/audit.repository.js";
import type { UserRepository } from "./user.repository.js";

const uptRoles: readonly Role[] = ["PETUGAS_UPT", "KOORDINATOR_UPT"];

function validateAssignment(
  role: Role,
  uptId: string | null | undefined,
  uptActive: boolean | undefined,
): void {
  if (uptRoles.includes(role)) {
    if (!uptId)
      throw new AppError(400, "VALIDATION_ERROR", "Role UPT wajib memiliki uptId.", [
        { field: "uptId", message: "UPT wajib diisi." },
      ]);
    if (uptActive !== true)
      throw new AppError(400, "VALIDATION_ERROR", "Penempatan harus menggunakan UPT aktif.", [
        { field: "uptId", message: "UPT tidak ditemukan atau tidak aktif." },
      ]);
    return;
  }
  if (uptId)
    throw new AppError(400, "VALIDATION_ERROR", "Role non-UPT tidak boleh memiliki uptId.", [
      { field: "uptId", message: "Kosongkan uptId untuk role ini." },
    ]);
}

export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly audit: AuditRepository,
  ) {}

  async list(input: {
    page: number;
    pageSize: number;
    search?: string | undefined;
    role?: string | undefined;
    uptId?: string | undefined;
    active?: boolean | undefined;
  }) {
    const role = input.role ? roleSchema.safeParse(input.role) : undefined;
    if (role && !role.success)
      throw new AppError(400, "VALIDATION_ERROR", "Role tidak valid.", [
        { field: "role", message: "Role tidak dikenal." },
      ]);
    return this.repository.list({
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      search: input.search,
      role: role?.data,
      uptId: input.uptId,
      active: input.active,
    });
  }

  async create(input: UserCreate, actorId: string): Promise<User> {
    const upt = input.uptId ? await this.repository.findUpt(input.uptId) : null;
    if (input.uptId && !upt)
      throw new AppError(400, "VALIDATION_ERROR", "UPT tidak ditemukan.", [
        { field: "uptId", message: "UPT tidak ditemukan." },
      ]);
    validateAssignment(input.role, input.uptId, upt?.active);
    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.create(
      {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        role: input.role,
        uptId: input.uptId ?? null,
        active: input.active,
        emailVerified: false,
      },
      passwordHash,
    );
    await this.audit.write({
      actorId,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role, uptId: user.uptId },
    });
    return user;
  }

  async update(
    id: string,
    input: {
      name?: string;
      email?: string;
      role?: Role;
      uptId?: string | null;
      active?: boolean;
      password?: string;
    },
    actorId: string,
    action = "USER_UPDATED",
  ): Promise<User> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new AppError(404, "NOT_FOUND", "Pengguna tidak ditemukan.");
    const role = input.role ?? existing.role;
    const uptId = input.uptId === undefined ? existing.uptId : input.uptId;
    const upt = uptId ? await this.repository.findUpt(uptId) : null;
    if (uptId && !upt)
      throw new AppError(400, "VALIDATION_ERROR", "UPT tidak ditemukan.", [
        { field: "uptId", message: "UPT tidak ditemukan." },
      ]);
    validateAssignment(role, uptId, upt?.active);
    const { password, ...userData } = input;
    const user = await this.repository.update(id, { ...userData, role, uptId });
    if (password) await this.repository.updatePassword(id, await hashPassword(password));
    await this.audit.write({
      actorId,
      action,
      entityType: "User",
      entityId: id,
      metadata: {
        role: user.role,
        uptId: user.uptId,
        active: user.active,
        passwordChanged: Boolean(password),
      },
    });
    return user;
  }
}
