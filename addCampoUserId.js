const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateSubscriptions() {
  const subscriptions = await prisma.subscription.findMany();

  for (let subscription of subscriptions) {
    if (!subscription.userId) {
      // Neste exemplo, estou adicionando userId de um valor fictício. Você deve atualizar com o valor real de userId
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { userId: "some-default-user-id" }, // Substitua "some-default-user-id" pelo valor real do userId
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
