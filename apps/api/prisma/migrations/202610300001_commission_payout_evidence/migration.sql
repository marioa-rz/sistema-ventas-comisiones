CREATE TYPE "CommissionPayoutMethod" AS ENUM ('CASH', 'TRANSFER');

ALTER TABLE "app_users"
  ADD COLUMN "bank_name" VARCHAR(120),
  ADD COLUMN "bank_account_number" VARCHAR(80),
  ADD CONSTRAINT "app_users_bank_destination_check" CHECK (
    ("bank_name" IS NULL AND "bank_account_number" IS NULL) OR
    (
      "bank_name" IS NOT NULL AND char_length(btrim("bank_name")) > 0 AND
      "bank_account_number" IS NOT NULL AND char_length(btrim("bank_account_number")) > 0
    )
  );

ALTER TABLE "commission_payouts"
  ADD COLUMN "method" "CommissionPayoutMethod" NOT NULL DEFAULT 'TRANSFER',
  ADD COLUMN "bank_name_snapshot" VARCHAR(120),
  ADD COLUMN "bank_account_number_snapshot" VARCHAR(80),
  ADD COLUMN "proof_storage_path" TEXT,
  ADD COLUMN "proof_original_filename" VARCHAR(255),
  ADD COLUMN "proof_mime_type" VARCHAR(100),
  ADD COLUMN "proof_size_bytes" INTEGER,
  ADD CONSTRAINT "commission_payouts_bank_snapshot_check" CHECK (
    ("bank_name_snapshot" IS NULL AND "bank_account_number_snapshot" IS NULL) OR
    (
      "bank_name_snapshot" IS NOT NULL AND char_length(btrim("bank_name_snapshot")) > 0 AND
      "bank_account_number_snapshot" IS NOT NULL AND char_length(btrim("bank_account_number_snapshot")) > 0
    )
  ),
  ADD CONSTRAINT "commission_payouts_proof_metadata_check" CHECK (
    (
      "proof_storage_path" IS NULL AND "proof_original_filename" IS NULL AND
      "proof_mime_type" IS NULL AND "proof_size_bytes" IS NULL
    ) OR (
      "proof_storage_path" IS NOT NULL AND "proof_original_filename" IS NOT NULL AND
      "proof_mime_type" IS NOT NULL AND "proof_size_bytes" IS NOT NULL AND "proof_size_bytes" > 0
    )
  ),
  ADD CONSTRAINT "commission_payouts_cash_evidence_check" CHECK (
    "method" = 'TRANSFER' OR (
      "bank_name_snapshot" IS NULL AND "bank_account_number_snapshot" IS NULL AND
      "proof_storage_path" IS NULL AND "proof_original_filename" IS NULL AND
      "proof_mime_type" IS NULL AND "proof_size_bytes" IS NULL
    )
  ),
  ADD CONSTRAINT "commission_payouts_transfer_evidence_check" CHECK (
    "method" = 'CASH' OR (
      "bank_name_snapshot" IS NOT NULL AND
      "bank_account_number_snapshot" IS NOT NULL AND
      "proof_storage_path" IS NOT NULL AND
      "proof_original_filename" IS NOT NULL AND
      "proof_mime_type" IN ('image/jpeg', 'image/png') AND
      "proof_size_bytes" IS NOT NULL AND "proof_size_bytes" > 0
    )
  ) NOT VALID;

ALTER TABLE "commission_payouts"
  ADD CONSTRAINT "commission_payouts_proof_storage_path_key" UNIQUE ("proof_storage_path");
