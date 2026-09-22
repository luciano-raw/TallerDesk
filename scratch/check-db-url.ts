
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.jjsycvzivyznuznblear:Daewoodamas7110@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

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
