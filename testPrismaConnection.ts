import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log("Conexão com o MongoDB bem-sucedida!");
  } catch (error) {
    console.error("Erro ao conectar com o MongoDB:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
