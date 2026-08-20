const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Repuestos:', await prisma.repuesto.count());
  console.log('RepuestoEnOT:', await prisma.repuestoEnOT.count());
  console.log('InventarioItem:', await prisma.inventarioItem.count());
  
  const repuestos = await prisma.repuesto.findMany();
  console.log(repuestos);
}
main().finally(() => prisma.$disconnect());
