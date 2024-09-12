const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updatePosts() {
  const posts = await prisma.post.findMany();

  for (let post of posts) {
    if (!post.imagePath) {
      await prisma.post.update({
        where: { id: post.id },
        data: { imagePath: null }, // Adiciona o campo imagePath como null para posts antigos
      });
    }
  }

  console.log("Todos os posts foram atualizados com o campo imagePath.");
}

updatePosts()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
