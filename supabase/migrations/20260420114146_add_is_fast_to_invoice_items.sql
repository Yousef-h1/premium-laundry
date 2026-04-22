/*
  # Add is_fast column to invoice_items

  ## Changes
  - Adds `is_fast` boolean column to `invoice_items` table
  - Default value is false (Normal service)
  - Enables per-line-item fast/normal tracking independent of the invoice-level flag

  ## Reason
  Previously, fast service was a single flag on the invoice level. This migration
  enables individual service rows to have their own fast/normal status.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'is_fast'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN is_fast boolean DEFAULT false;
  END IF;
END $$;
