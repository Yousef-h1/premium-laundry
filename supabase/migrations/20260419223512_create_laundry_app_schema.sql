
/*
  # Premium Service Laundry - مغسلة الخدمة المميزة

  ## Schema Overview
  Creates the complete schema for a bilingual laundry management system.

  ### New Tables

  1. **services** - Service catalog with bilingual names and pricing
     - `id` (uuid, primary key)
     - `name_en` (text) - English service name
     - `name_ar` (text) - Arabic service name
     - `wash_iron_price` (numeric) - Price for wash + iron service
     - `iron_only_price` (numeric, nullable) - Price for iron-only service
     - `requires_inspection` (boolean) - Whether price is set after inspection
     - `sort_order` (int) - Display order

  2. **customers** - Customer profiles
     - `id` (uuid, primary key)
     - `name` (text) - Customer name
     - `phone` (text) - Phone number
     - `is_credit` (boolean) - Whether customer is on credit/subscription plan
     - `created_at` (timestamptz)

  3. **invoices** - Invoice headers
     - `id` (uuid, primary key)
     - `invoice_number` (text, unique) - Human-readable invoice number
     - `customer_id` (uuid, nullable) - FK to customers
     - `customer_name` (text) - Snapshot of customer name
     - `customer_phone` (text) - Snapshot of customer phone
     - `is_fast_service` (boolean) - Fast service multiplier applied
     - `discount` (numeric) - Discount amount
     - `subtotal` (numeric) - Before discount
     - `total` (numeric) - Final total
     - `status` (text) - 'unpaid' | 'paid_cash' | 'paid_benefit' | 'cancelled'
     - `payment_method` (text, nullable)
     - `notes` (text)
     - `created_at` (timestamptz)
     - `paid_at` (timestamptz, nullable)

  4. **invoice_items** - Line items for each invoice
     - `id` (uuid, primary key)
     - `invoice_id` (uuid, FK)
     - `service_id` (uuid, nullable, FK)
     - `service_name_en` (text) - Snapshot
     - `service_name_ar` (text) - Snapshot
     - `service_type` (text) - 'wash_iron' | 'iron_only' | 'inspection'
     - `quantity` (int)
     - `unit_price` (numeric)
     - `total_price` (numeric)

  ### Security
  - RLS enabled on all tables
  - Anonymous access allowed for this single-tenant POS system
*/

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text NOT NULL,
  wash_iron_price numeric(10,3),
  iron_only_price numeric(10,3),
  requires_inspection boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to services"
  ON services FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert services"
  ON services FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update services"
  ON services FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  is_credit boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select customers"
  ON customers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert customers"
  ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update customers"
  ON customers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete customers"
  ON customers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  is_fast_service boolean DEFAULT false,
  discount numeric(10,3) DEFAULT 0,
  subtotal numeric(10,3) DEFAULT 0,
  total numeric(10,3) DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select invoices"
  ON invoices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert invoices"
  ON invoices FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update invoices"
  ON invoices FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete invoices"
  ON invoices FOR DELETE
  TO anon, authenticated
  USING (true);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  service_name_en text NOT NULL,
  service_name_ar text NOT NULL,
  service_type text NOT NULL DEFAULT 'wash_iron',
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,3) NOT NULL DEFAULT 0,
  total_price numeric(10,3) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select invoice_items"
  ON invoice_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert invoice_items"
  ON invoice_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update invoice_items"
  ON invoice_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete invoice_items"
  ON invoice_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- Seed services data
INSERT INTO services (name_en, name_ar, wash_iron_price, iron_only_price, requires_inspection, sort_order) VALUES
  ('Steam Abaya', 'عباية بالبخار', 1.000, 0.500, false, 1),
  ('Sheila - Hijab', 'شيلة - حجاب', 0.200, 0.200, false, 2),
  ('Bath Towel', 'فوطة استجمام', 0.600, NULL, false, 3),
  ('Bed Sheet (Single)', 'غطاء سرير فردي', 0.500, NULL, false, 4),
  ('Bed Sheet (Double)', 'غطاء سرير مزدوج', 0.800, NULL, false, 5),
  ('Blanket (Large)', 'بطانية كبيرة', 2.000, NULL, false, 6),
  ('Blanket (Small)', 'بطانية صغيرة', 1.500, NULL, false, 7),
  ('Dress', 'فستان', NULL, NULL, true, 8),
  ('Ghutra', 'غترة', 0.400, 0.200, false, 9),
  ('Jacket (Steam)', 'جاكيت بخار', 0.800, NULL, false, 10),
  ('Long Pants', 'بنطلون طويل', 0.600, 0.300, false, 11),
  ('Short Pants', 'بنطلون قصير', 0.400, 0.200, false, 12),
  ('Pillow Case', 'غطاء مخدة', 0.200, NULL, false, 13),
  ('Shirt / Blouse', 'قميص / قميص بيت نسائي', 0.600, 0.400, false, 14),
  ('Skirt (Long/Short)', 'تنورة قصير - طويل', 0.600, 0.300, false, 15),
  ('Socks', 'جوارب', 0.100, NULL, false, 16),
  ('Official Uniform', 'بدلة وزارة الداخلية', 1.000, 0.400, false, 17),
  ('Thobe', 'ثوب', 0.500, 0.150, false, 18),
  ('Winter Thobe', 'ثوب شتوي', 0.600, 0.200, false, 19),
  ('Undershirt', 'فانيلة', 0.400, 0.200, false, 20),
  ('Bisht', 'بشت', 1.000, 0.500, false, 21),
  ('Carpet / Curtain', 'سجاد / ستارة 2م', 1.000, NULL, false, 22),
  ('Formal Suit (3pcs)', 'بدلة رسمية 3 قطع', 1.500, 0.800, false, 23),
  ('Shoes', 'حذاء', 2.000, NULL, false, 24),
  ('School Bag', 'شنطة مدرسية', 1.000, NULL, false, 25)
ON CONFLICT DO NOTHING;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;
