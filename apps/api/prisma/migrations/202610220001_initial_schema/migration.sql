CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "ProofReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

CREATE TABLE "app_users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "auth_user_id" UUID NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "role" "UserRole" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "app_users_auth_user_id_key" UNIQUE ("auth_user_id"),
  CONSTRAINT "app_users_display_name_check" CHECK (char_length(btrim("display_name")) > 0)
);

CREATE TABLE "customers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customers_name_check" CHECK (char_length(btrim("name")) > 0),
  CONSTRAINT "customers_phone_check" CHECK (char_length(btrim("phone")) BETWEEN 7 AND 32)
);

CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "categories_slug_key" UNIQUE ("slug"),
  CONSTRAINT "categories_name_check" CHECK (char_length(btrim("name")) > 0),
  CONSTRAINT "categories_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE "products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "main_image_path" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "products_name_check" CHECK (char_length(btrim("name")) > 0)
);

CREATE TABLE "product_variants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "sku" VARCHAR(64) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "price" NUMERIC(12,2) NOT NULL,
  "image_path" TEXT,
  "is_available" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variants_sku_key" UNIQUE ("sku"),
  CONSTRAINT "product_variants_price_check" CHECK ("price" >= 0),
  CONSTRAINT "product_variants_sku_check" CHECK (char_length(btrim("sku")) > 0),
  CONSTRAINT "product_variants_name_check" CHECK (char_length(btrim("name")) > 0)
);

CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_code" VARCHAR(16) NOT NULL,
  "idempotency_key" VARCHAR(128),
  "customer_id" UUID NOT NULL,
  "seller_id" UUID,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "total_amount" NUMERIC(12,2) NOT NULL,
  "commission_amount" NUMERIC(12,2) NOT NULL,
  "assigned_at" TIMESTAMPTZ(6),
  "confirmed_at" TIMESTAMPTZ(6),
  "confirmed_by_id" UUID,
  "cancelled_at" TIMESTAMPTZ(6),
  "cancelled_by_id" UUID,
  "cancellation_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_public_code_key" UNIQUE ("public_code"),
  CONSTRAINT "orders_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "orders_public_code_check" CHECK ("public_code" ~ '^VNT-[A-Z0-9]{6}$'),
  CONSTRAINT "orders_total_amount_check" CHECK ("total_amount" > 0),
  CONSTRAINT "orders_commission_amount_check" CHECK ("commission_amount" >= 0),
  CONSTRAINT "orders_assignment_check" CHECK (
    ("seller_id" IS NULL AND "assigned_at" IS NULL) OR
    ("seller_id" IS NOT NULL AND "assigned_at" IS NOT NULL)
  ),
  CONSTRAINT "orders_state_fields_check" CHECK (
    ("status" = 'PENDING' AND "confirmed_at" IS NULL AND "confirmed_by_id" IS NULL AND "cancelled_at" IS NULL AND "cancelled_by_id" IS NULL) OR
    ("status" = 'CONFIRMED' AND "seller_id" IS NOT NULL AND "confirmed_at" IS NOT NULL AND "confirmed_by_id" IS NOT NULL AND "cancelled_at" IS NULL AND "cancelled_by_id" IS NULL) OR
    ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND "cancelled_by_id" IS NOT NULL AND "confirmed_at" IS NULL AND "confirmed_by_id" IS NULL)
  )
);

CREATE TABLE "order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "product_variant_id" UUID,
  "product_name_snapshot" VARCHAR(160) NOT NULL,
  "variant_name_snapshot" VARCHAR(120) NOT NULL,
  "sku_snapshot" VARCHAR(64) NOT NULL,
  "unit_price" NUMERIC(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "subtotal" NUMERIC(12,2) NOT NULL,
  "commission_rate" NUMERIC(5,4) NOT NULL,
  "commission_amount" NUMERIC(12,2) NOT NULL,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "order_items_unit_price_check" CHECK ("unit_price" >= 0),
  CONSTRAINT "order_items_subtotal_check" CHECK ("subtotal" = round("unit_price" * "quantity", 2)),
  CONSTRAINT "order_items_commission_rate_check" CHECK (
    ("unit_price" < 100 AND "commission_rate" = 0.1000) OR
    ("unit_price" >= 100 AND "commission_rate" = 0.2000)
  ),
  CONSTRAINT "order_items_commission_amount_check" CHECK (
    "commission_amount" = round("subtotal" * "commission_rate", 2)
  )
);

CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "cash_received_at" TIMESTAMPTZ(6),
  "cash_received_by_id" UUID,
  "verified_at" TIMESTAMPTZ(6),
  "verified_by_id" UUID,
  "rejection_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "payments_cash_received_check" CHECK (
    ("cash_received_at" IS NULL AND "cash_received_by_id" IS NULL) OR
    ("method" = 'CASH' AND "cash_received_at" IS NOT NULL AND "cash_received_by_id" IS NOT NULL)
  ),
  CONSTRAINT "payments_status_fields_check" CHECK (
    ("status" = 'PENDING' AND "verified_at" IS NULL AND "verified_by_id" IS NULL AND "rejection_reason" IS NULL) OR
    ("status" = 'VERIFIED' AND "verified_at" IS NOT NULL AND "verified_by_id" IS NOT NULL AND "rejection_reason" IS NULL) OR
    ("status" = 'REJECTED' AND "verified_at" IS NULL AND "verified_by_id" IS NOT NULL AND char_length(btrim("rejection_reason")) > 0)
  )
);

CREATE TABLE "payment_proofs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "storage_path" TEXT NOT NULL,
  "original_filename" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "review_status" "ProofReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_id" UUID,
  "rejection_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_proofs_storage_path_key" UNIQUE ("storage_path"),
  CONSTRAINT "payment_proofs_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880),
  CONSTRAINT "payment_proofs_mime_check" CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'application/pdf')),
  CONSTRAINT "payment_proofs_review_check" CHECK (
    ("review_status" = 'PENDING' AND "reviewed_at" IS NULL AND "reviewed_by_id" IS NULL AND "rejection_reason" IS NULL) OR
    ("review_status" = 'ACCEPTED' AND "reviewed_at" IS NOT NULL AND "reviewed_by_id" IS NOT NULL AND "rejection_reason" IS NULL) OR
    ("review_status" = 'REJECTED' AND "reviewed_at" IS NOT NULL AND "reviewed_by_id" IS NOT NULL AND char_length(btrim("rejection_reason")) > 0)
  )
);

CREATE TABLE "commission_payouts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "seller_id" UUID NOT NULL,
  "amount" NUMERIC(12,2) NOT NULL,
  "paid_at" TIMESTAMPTZ(6) NOT NULL,
  "administered_by_id" UUID NOT NULL,
  "reference" VARCHAR(160),
  "note" VARCHAR(500),
  "idempotency_key" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_payouts_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "commission_payouts_amount_check" CHECK ("amount" > 0)
);

CREATE TABLE "commissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "payout_id" UUID,
  "amount" NUMERIC(12,2) NOT NULL,
  "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "approved_at" TIMESTAMPTZ(6),
  "paid_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commissions_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "commissions_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "commissions_status_fields_check" CHECK (
    ("status" = 'PENDING' AND "approved_at" IS NULL AND "paid_at" IS NULL AND "payout_id" IS NULL) OR
    ("status" = 'APPROVED' AND "approved_at" IS NOT NULL AND "paid_at" IS NULL AND "payout_id" IS NULL) OR
    ("status" = 'PAID' AND "approved_at" IS NOT NULL AND "paid_at" IS NOT NULL AND "payout_id" IS NOT NULL)
  )
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" UUID,
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" UUID NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_action_check" CHECK (char_length(btrim("action")) > 0),
  CONSTRAINT "audit_logs_entity_type_check" CHECK (char_length(btrim("entity_type")) > 0),
  CONSTRAINT "audit_logs_metadata_object_check" CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "app_users_role_active_idx" ON "app_users"("role", "is_active");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "categories_active_name_idx" ON "categories"("is_active", "name");
CREATE INDEX "products_category_active_name_idx" ON "products"("category_id", "is_active", "name");
CREATE INDEX "product_variants_product_available_idx" ON "product_variants"("product_id", "is_available");
CREATE INDEX "orders_seller_status_created_idx" ON "orders"("seller_id", "status", "created_at");
CREATE INDEX "orders_status_created_idx" ON "orders"("status", "created_at");
CREATE INDEX "orders_status_confirmed_idx" ON "orders"("status", "confirmed_at");
CREATE INDEX "order_items_order_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_variant_idx" ON "order_items"("product_variant_id");
CREATE INDEX "payments_status_created_idx" ON "payments"("status", "created_at");
CREATE INDEX "payment_proofs_payment_status_idx" ON "payment_proofs"("payment_id", "review_status", "created_at");
CREATE INDEX "commission_payouts_seller_paid_idx" ON "commission_payouts"("seller_id", "paid_at");
CREATE INDEX "commissions_seller_status_created_idx" ON "commissions"("seller_id", "status", "created_at");
CREATE INDEX "commissions_status_approved_idx" ON "commissions"("status", "approved_at");
CREATE INDEX "commissions_payout_idx" ON "commissions"("payout_id");
CREATE INDEX "audit_logs_entity_created_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs"("actor_id", "created_at");

ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_received_by_id_fkey" FOREIGN KEY ("cash_received_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_administered_by_id_fkey" FOREIGN KEY ("administered_by_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "commission_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE "app_users"
      ADD CONSTRAINT "app_users_auth_user_id_fkey"
      FOREIGN KEY ("auth_user_id") REFERENCES auth.users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  ELSE
    RAISE NOTICE 'auth.users no existe; FK se añadirá al desplegar sobre Supabase';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_users_set_updated_at BEFORE UPDATE ON "app_users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON "customers" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON "categories" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON "product_variants" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON "orders" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON "payments" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER commissions_set_updated_at BEFORE UPDATE ON "commissions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE "app_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_proofs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_payouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
