const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ots = await prisma.ordenTrabajo.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { trabajos: true }
  });
  console.dir(ots, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
