import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dbToken = await prisma.sistemaConfig.findUnique({ where: { key: "MELI_ACCESS_TOKEN" } });
  const token = dbToken?.value || null;
  
  const res = await fetch(`https://api.mercadolibre.com/products/MLC67917132`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("Status product:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data).substring(0, 1000));
}
main().catch(console.error);
