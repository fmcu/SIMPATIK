import { PrismaClient, type UPT } from "@prisma/client";

type UPTListArgs = {
  skip: number;
  take: number;
  search?: string | undefined;
  active?: boolean | undefined;
};

export interface UptRepository {
  list(args: UPTListArgs): Promise<{ items: UPT[]; total: number }>;
  findById(id: string): Promise<UPT | null>;
  create(data: { code: string; name: string; active: boolean }): Promise<UPT>;
  update(id: string, data: { code?: string; name?: string; active?: boolean }): Promise<UPT>;
}

export function createUptRepository(database: PrismaClient = new PrismaClient()): UptRepository {
  return {
    async list({ skip, take, search, active }) {
      const where = {
        ...(active === undefined ? {} : { active }),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" as const } },
                { name: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        database.uPT.findMany({ where, skip, take, orderBy: { code: "asc" } }),
        database.uPT.count({ where }),
      ]);
      return { items, total };
    },
    findById: (id) => database.uPT.findUnique({ where: { id } }),
    create: (data) => database.uPT.create({ data }),
    update: (id, data) => database.uPT.update({ where: { id }, data }),
  };
}
