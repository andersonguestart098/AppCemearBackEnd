const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanSubscriptions() {
  try {
    const subscriptions = await prisma.subscription.findMany();

    // Dicionário para armazenar endpoints únicos
    const uniqueSubscriptions = new Map();

    for (let subscription of subscriptions) {
      // Verifica se o endpoint já está no mapa
      if (!uniqueSubscriptions.has(subscription.endpoint)) {
        uniqueSubscriptions.set(subscription.endpoint, subscription.id); // Adiciona se não estiver presente
      } else {
        // Se o endpoint já existe, remove a assinatura duplicada
        await prisma.subscription.delete({
          where: { id: subscription.id },
        });
        console.log(`Assinatura duplicada removida: ${subscription.id}`);
      }
    }

    console.log("Limpeza de assinaturas duplicadas finalizada.");
  } catch (error) {
    console.error("Erro ao limpar assinaturas:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSubscriptions()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
