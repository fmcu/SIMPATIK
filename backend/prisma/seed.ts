import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import { PrismaClient, type Role } from "@prisma/client";

const prisma = new PrismaClient();

const upts = Array.from({ length: 12 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return { code: `UPT-${number}`, name: `UPT Placeholder ${number}`, active: true };
});

const users: Array<{
  email: string;
  name: string;
  role: Role;
  uptCode?: string;
}> = [
  { email: "pimpinan@simpatik.local", name: "Pimpinan Development", role: "PIMPINAN" },
  {
    email: "product.owner@simpatik.local",
    name: "Product Owner Development",
    role: "PRODUCT_OWNER",
  },
  {
    email: "petugas.kanwil@simpatik.local",
    name: "Petugas Kanwil Development",
    role: "PETUGAS_KANWIL",
  },
  {
    email: "koordinator.upt@simpatik.local",
    name: "Koordinator UPT Development",
    role: "KOORDINATOR_UPT",
    uptCode: "UPT-01",
  },
  {
    email: "petugas.upt@simpatik.local",
    name: "Petugas UPT Development",
    role: "PETUGAS_UPT",
    uptCode: "UPT-01",
  },
  { email: "admin@simpatik.local", name: "Admin SIMPATIK Development", role: "ADMIN_SIMPATIK" },
  {
    email: "system.admin@simpatik.local",
    name: "System Administrator Development",
    role: "SYSTEM_ADMIN",
  },
];

async function main(): Promise<void> {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("SEED_PASSWORD wajib diisi dan minimal 8 karakter untuk menjalankan seed.");
  }

  for (const upt of upts) {
    await prisma.uPT.upsert({
      where: { code: upt.code },
      update: { name: upt.name, active: upt.active },
      create: upt,
    });
  }

  const passwordHash = await hashPassword(password);
  for (const input of users) {
    const upt = input.uptCode
      ? await prisma.uPT.findUniqueOrThrow({ where: { code: input.uptCode }, select: { id: true } })
      : null;
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {
        name: input.name,
        role: input.role,
        uptId: upt?.id ?? null,
        active: true,
        emailVerified: true,
      },
      create: {
        id: `seed-${input.role.toLowerCase()}`,
        name: input.name,
        email: input.email,
        role: input.role,
        uptId: upt?.id ?? null,
        active: true,
        emailVerified: true,
      },
    });
    await prisma.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      update: { password: passwordHash },
      create: {
        id: `${user.id}-credential`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
