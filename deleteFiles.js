const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function deletePostsWithoutImages() {
  const posts = await prisma.post.findMany({
    where: { imagePath: null }, // Filtra posts que têm imagePath como null
  });

  for (let post of posts) {
    await prisma.post.delete({
      where: { id: post.id },
    });
  }

  console.log("Todos os posts sem imagem foram deletados.");
}

deletePostsWithoutImages()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
