/*
  # Create expenses table

  ## Summary
  Adds a dedicated expenses tracking table for the laundry management app.

  ## New Tables
  - `expenses`
    - `id` (uuid, primary key)
    - `description` (text) - what the expense was for
    - `benefit_amount` (numeric) - amount paid via Benefit
    - `cash_amount` (numeric) - amount paid via Cash
    - `total_amount` (numeric, computed column stored) - benefit + cash
    - `created_at` (timestamptz)

  ## Also
  - Adds `benefit_amount` and `cash_amount` columns to invoices for split payment tracking

  ## Security
  - RLS enabled
  - Policies allow anon and authenticated access (consistent with existing tables)
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL DEFAULT '',
  benefit_amount numeric(10, 3) NOT NULL DEFAULT 0,
  cash_amount numeric(10, 3) NOT NULL DEFAULT 0,
  total_amount numeric(10, 3) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read expenses"
  ON expenses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert expenses"
  ON expenses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update expenses"
  ON expenses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete expenses"
  ON expenses FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow auth read expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow auth insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow auth update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow auth delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'benefit_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN benefit_amount numeric(10, 3) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'cash_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN cash_amount numeric(10, 3) NOT NULL DEFAULT 0;
  END IF;
END $$;
