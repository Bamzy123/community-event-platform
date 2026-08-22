import { prisma } from "./primas";

async function main() {
  await prisma.$connect();

  console.log("Database connection successful!");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Database connection failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});