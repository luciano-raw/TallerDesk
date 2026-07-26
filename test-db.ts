import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function main() {
  try {
    console.log("Intentando conectar a la base de datos...");
    // Intentar una consulta sencilla para probar la conexión
    const usersCount = await prisma.usuario.count();
    console.log(`Conexión exitosa. Se encontraron ${usersCount} usuarios en la base de datos.`);
    
    // Buscar si el SUPER_ADMIN existe
    const superAdmin = await prisma.usuario.findFirst({
      where: { email: 'luciano.raw04@gmail.com' },
      select: { email: true, role: true, nombre: true }
    });

    if (superAdmin) {
      console.log("Super Admin encontrado:", superAdmin);
    } else {
      console.log("El Super Admin luciano.raw04@gmail.com aún no ha sido registrado en la base de datos.");
    }
  } catch (error) {
    console.error("Error al conectar con la base de datos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
