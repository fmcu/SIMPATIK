import { PrismaClient, type Role, type User } from "@prisma/client";

type UserListArgs = {
  skip: number;
  take: number;
  search?: string | undefined;
  role?: Role | undefined;
  uptId?: string | undefined;
  active?: boolean | undefined;
};

export interface UserRepository {
  list(args: UserListArgs): Promise<{ items: User[]; total: number }>;
  findById(id: string): Promise<User | null>;
  findUpt(id: string): Promise<{ id: string; active: boolean } | null>;
  create(
    data: {
      id: string;
      name: string;
      email: string;
      role: Role;
      uptId?: string | null;
      active: boolean;
      emailVerified: boolean;
    },
    passwordHash: string,
  ): Promise<User>;
  update(
    id: string,
    data: { name?: string; email?: string; role?: Role; uptId?: string | null; active?: boolean },
  ): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}

export function createUserRepository(database: PrismaClient = new PrismaClient()): UserRepository {
  return {
    async list({ skip, take, search, role, uptId, active }) {
      const where = {
        ...(role ? { role } : {}),
        ...(uptId ? { uptId } : {}),
        ...(active === undefined ? {} : { active }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        database.user.findMany({ where, skip, take, orderBy: { name: "asc" } }),
        database.user.count({ where }),
      ]);
      return { items, total };
    },
    findById: (id) => database.user.findUnique({ where: { id } }),
    findUpt: (id) => database.uPT.findUnique({ where: { id }, select: { id: true, active: true } }),
    create: (data, passwordHash) =>
      database.$transaction(async (transaction) => {
        const user = await transaction.user.create({ data });
        await transaction.account.create({
          data: {
            id: `${user.id}-credential`,
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password: passwordHash,
          },
        });
        return user;
      }),
    update: (id, data) => database.user.update({ where: { id }, data }),
    updatePassword: async (id, passwordHash) => {
      const account = await database.account.findFirst({ where: { userId: id, providerId: "credential" }, select: { id: true } });
      if (account) {
        await database.account.update({ where: { id: account.id }, data: { password: passwordHash } });
        return;
      }
      await database.account.create({ data: { id: `${id}-credential`, accountId: id, providerId: "credential", userId: id, password: passwordHash } });
    },
  };
}
