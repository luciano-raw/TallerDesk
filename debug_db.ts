import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ots = await prisma.ordenTrabajo.findMany({
    include: {
      trabajos: true,
      tecnico: true
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.dir(ots, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
