const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateSubscriptions() {
  const subscriptions = await prisma.subscription.findMany();

  for (let subscription of subscriptions) {
    if (!subscription.userId) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { userId: "default-user-id" }, // Adiciona o campo userId com valor padrão
      });
    }
  }

  console.log("Todas as subscriptions foram atualizadas com o campo userId.");
}

updateSubscriptions()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
