import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({
    orderBy: { createdAt: 'desc' },
    include: { taller: true }
  });
  
  for (const u of users) {
    console.log(u.email, u.taller?.nombre, u.id);
  }
}
main();