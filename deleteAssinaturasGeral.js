const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanAllSubscriptions() {
  try {
    // Deleta todas as assinaturas
    await prisma.subscription.deleteMany();

    console.log("Todas as assinaturas foram removidas.");
  } catch (error) {
    console.error("Erro ao limpar assinaturas:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllSubscriptions()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
