const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateSubscriptions() {
  const subscriptions = await prisma.subscription.findMany();

  for (let subscription of subscriptions) {
    if (!subscription.userId) {
      // Aqui, você pode buscar o ID do usuário real ou atribuir um valor padrão.
      // Exemplo: Atribuindo um ID padrão de um usuário específico.
      const defaultUserId = "some-default-user-id"; // Substitua pelo ID real do usuário

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { userId: defaultUserId }, // Associa cada assinatura a um usuário
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
