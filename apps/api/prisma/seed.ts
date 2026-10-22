import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DIRECT_URL or DATABASE_URL is required to seed');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

async function main(): Promise<void> {
  const category = await prisma.category.upsert({
    where: { slug: 'labiales' },
    update: { name: 'Labiales', isActive: true },
    create: {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Labiales',
      slug: 'labiales',
    },
  });

  const product = await prisma.product.upsert({
    where: { id: '20000000-0000-4000-8000-000000000001' },
    update: { name: 'Labial de muestra', categoryId: category.id, isActive: true },
    create: {
      id: '20000000-0000-4000-8000-000000000001',
      categoryId: category.id,
      name: 'Labial de muestra',
      description: 'Producto ficticio para desarrollo local.',
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: 'DEMO-LAB-ROSA' },
    update: { productId: product.id, name: 'Rosa', price: '80.00', isAvailable: true },
    create: {
      id: '30000000-0000-4000-8000-000000000001',
      productId: product.id,
      sku: 'DEMO-LAB-ROSA',
      name: 'Rosa',
      price: '80.00',
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: 'DEMO-LAB-PREMIUM' },
    update: { productId: product.id, name: 'Premium', price: '125.00', isAvailable: true },
    create: {
      id: '30000000-0000-4000-8000-000000000002',
      productId: product.id,
      sku: 'DEMO-LAB-PREMIUM',
      name: 'Premium',
      price: '125.00',
    },
  });
}

main().finally(async () => prisma.$disconnect());
