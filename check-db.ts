import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const res = await prisma.usuario.deleteMany({
    where: { email: { in: ["feer.parada17@gmail.com", "feer.parada17@gmail.com".toLowerCase()] } }
  });
  console.log("Usuarios eliminados:", res.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
