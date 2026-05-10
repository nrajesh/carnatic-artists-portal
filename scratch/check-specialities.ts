
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const specialities = await prisma.speciality.findMany();
  console.log("Specialities in DB:");
  console.table(specialities);
}

main().catch(console.error).finally(() => prisma.$disconnect());
