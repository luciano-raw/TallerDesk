import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dbToken = await prisma.sistemaConfig.findUnique({ where: { key: "MELI_ACCESS_TOKEN" } });
  const token = dbToken?.value || null;
  
  const res = await fetch(`https://api.mercadolibre.com/items?ids=MLC1402280205,MLC1234567`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Status items:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data).substring(0, 500));
}
main().catch(console.error);
