import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function run() {
  console.log('Testing prisma insert...');
  try {
    const ot = await prisma.ordenTrabajo.findFirst();
    const foto = await prisma.fotoOT.create({
      data: {
        ordenTrabajoId: ot.id,
        url: 'https://test.com/foto.jpg',
        esRecepcion: true,
        descripcion: 'test'
      }
    });
    console.log('Prisma insert succeeded!', foto.id);
  } catch (error) {
    console.error('Prisma insert failed!', error);
  }
}

run();
