
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jjsycvzivyznuznblear:Daewoodamas7110@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function main() {
  try {
    // Buscar el primer taller que no sea de luciano.raw04 para probar
    const taller = await prisma.taller.findFirst();
    if (!taller) { console.log('Taller no existe'); return; }

    console.log('Taller a insertar:', taller.nombre);

    const email = 'fernanditaparada10@gmail.com'; // Que ya est en RawGarage

    const existingInTaller = await prisma.usuario.findFirst({ where: { email, tallerId: taller.id } });
    if (existingInTaller) { console.log('Ya en taller'); return; }

    const anyExisting = await prisma.usuario.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } });

    const u = await prisma.usuario.create({
      data: {
        email,
        nombre: 'Prueba Duplicado',
        roles: ['TALLER_JEFE'],
        tallerId: taller.id,
        clerkId: anyExisting?.clerkId 
      }
    });
    console.log('Creado exitosamente:', u);
    
    // Limpiar prueba
    await prisma.usuario.delete({ where: { id: u.id } });
    console.log('Prueba limpiada');

  } catch (e) {
    console.error('ERROR PRISMA:', e);
  }
}
main();
