import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log("Conectado ao MongoDB com sucesso!");
  } catch (error) {
    console.error("Error ao conectar ao MongoDB:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
