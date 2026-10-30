-- CreateEnum
CREATE TYPE "CommissionPayoutStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "commission_payouts"
  ADD COLUMN "status" "CommissionPayoutStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(6),
  ADD COLUMN "cancelled_by_id" UUID,
  ADD COLUMN "cancellation_reason" VARCHAR(500);

-- CreateTable
CREATE TABLE "commission_payout_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payout_id" UUID NOT NULL,
  "commission_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "commission_payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_payout_items_payout_commission_key" ON "commission_payout_items"("payout_id", "commission_id");
CREATE INDEX "commission_payout_items_commission_idx" ON "commission_payout_items"("commission_id");

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payout_items" ADD CONSTRAINT "commission_payout_items_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "commission_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commission_payout_items" ADD CONSTRAINT "commission_payout_items_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "commissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill commission_payout_items for existing payouts
INSERT INTO "commission_payout_items" ("payout_id", "commission_id", "created_at")
SELECT "payout_id", "id", COALESCE("paid_at", "created_at")
FROM "commissions"
WHERE "payout_id" IS NOT NULL
ON CONFLICT DO NOTHING;
