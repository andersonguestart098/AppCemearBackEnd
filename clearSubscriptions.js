const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearSubscriptions() {
  try {
    await prisma.subscription.deleteMany({});
    console.log("Todas as assinaturas foram removidas.");
  } catch (error) {
    console.error("Erro ao limpar assinaturas:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSubscriptions();
