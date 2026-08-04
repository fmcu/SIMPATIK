import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const upts = Array.from({ length: 12 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return { code: `UPT-${number}`, name: `UPT Placeholder ${number}`, active: true };
});

async function main(): Promise<void> {
  for (const upt of upts) {
    await prisma.uPT.upsert({
      where: { code: upt.code },
      update: { name: upt.name },
      create: upt,
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
