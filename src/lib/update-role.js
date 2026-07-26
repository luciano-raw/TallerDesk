const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({
    where: { role: 'TALLER_TECNICO' }
  });

  if (users.length > 0) {
    // Tomar al último usuario que se haya registrado o a todos
    for (const user of users) {
      let taller = await prisma.taller.findFirst({ where: { slug: 'taller-demo-propio' } });
      if (!taller) {
        taller = await prisma.taller.create({
          data: {
            nombre: 'Taller del Dueño',
            slug: 'taller-demo-propio'
          }
        });
      }
      
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          role: 'TALLER_ADMIN',
          tallerId: taller.id
        }
      });
      console.log(`Usuario ${user.email} actualizado a TALLER_ADMIN y asociado al taller.`);
    }
  } else {
    console.log('No se encontraron usuarios TALLER_TECNICO para actualizar.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
