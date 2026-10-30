import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    console.log(`\n Total de productos encontrados: ${products.length}\n`);
    for (const p of products) {
      console.log(`- [${p.category.name}] ${p.name}`);
      console.log(`  Imagen: ${p.mainImagePath}`);
      for (const v of p.variants) {
        console.log(`    Variante: ${v.name} | SKU: ${v.sku} | Precio: Q${v.price}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
