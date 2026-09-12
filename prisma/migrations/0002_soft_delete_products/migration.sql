-- Preserve products referenced by historical sale items while hiding them from active inventory.
ALTER TABLE "products" ADD COLUMN "deleted_at" TIMESTAMP(3);