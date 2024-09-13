const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function recreateSubscriptions() {
  try {
    // Deletando a coleção Subscriptions
    await prisma.$executeRaw`db.subscriptions.drop()`;

    console.log("Coleção 'subscriptions' deletada com sucesso.");

    // Recriando a coleção com os campos necessários
    await prisma.subscription.create({
      data: {
        endpoint: "https://fcm.googleapis.com/fcm/send/exemplo", // Substitua com o valor real
        p256dh: "chaveP256dh", // Substitua com a chave real
        auth: "chaveAuth", // Substitua com a chave real
        userId: "66d0d063e80667143e188ac8", // Substitua por um ID de usuário válido
        createdAt: new Date(),
        keys: JSON.stringify({ p256dh: "chaveP256dh", auth: "chaveAuth" }),
      },
    });

    console.log("Nova coleção 'subscriptions' criada com sucesso.");
  } catch (error) {
    console.error("Erro ao recriar a coleção 'subscriptions':", error);
  } finally {
    await prisma.$disconnect();
  }
}

recreateSubscriptions()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
