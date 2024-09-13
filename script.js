const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateSubscriptions() {
  const users = await prisma.user.findMany(); // Encontrar todos os usuários
  const subscriptions = await prisma.subscription.findMany(); // Encontrar todas as subscriptions

  if (!users.length || !subscriptions.length) {
    console.log("Nenhum usuário ou subscription encontrada.");
    return;
  }

  for (let subscription of subscriptions) {
    // Atribui um userId aleatório para cada assinatura (substitua com lógica adequada)
    const randomUser = users[Math.floor(Math.random() * users.length)];

    // Atualiza as subscriptions com o campo userId
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { userId: randomUser.id },
    });
  }

  console.log("Todas as subscriptions foram atualizadas com o campo userId.");
}

async function updateUsers() {
  const users = await prisma.user.findMany();

  for (let user of users) {
    const userSubscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
    });

    if (userSubscriptions.length > 0) {
      // Atualiza os usuários com as subscriptions relacionadas
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptions: {
            connect: userSubscriptions.map((sub) => ({ id: sub.id })),
          },
        },
      });
    }
  }

  console.log("Os usuários foram atualizados com o campo subscriptions.");
}

async function updateModels() {
  try {
    await updateSubscriptions();
    await updateUsers();
  } catch (error) {
    console.error("Erro ao atualizar os campos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateModels();
