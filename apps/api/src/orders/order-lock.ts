import { Prisma } from '../generated/prisma/client';

export async function lockOrder(transaction: Prisma.TransactionClient, orderId: string): Promise<void> {
  await transaction.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "orders"
    WHERE "id" = CAST(${orderId} AS uuid)
    FOR UPDATE
  `);
}
