/*
  # Replace Services With Verified Pricing Data

  ## What This Migration Does

  Replaces all service catalog entries with the exact verified dataset provided.
  The invoice_items table retains its name snapshots (service_name_en/ar columns)
  so no historical invoice data is lost.

  ## Changes
  
  1. **invoice_items.service_id FK** - Changed to ON DELETE SET NULL so removing
     services never breaks existing invoices (name snapshots are the source of truth).

  2. **services table** - Fully cleared and re-seeded with the canonical 25-item
     price list, split into separate name_en / name_ar columns.

  ## Pricing Rules (enforced in UI)
  - Wash+Iron price  = wash_iron_price   (or ×2 when Fast Service is on)
  - Iron Only price  = iron_only_price   (or ×2 when Fast Service is on)
  - Inspection items = manual price entry after adding to cart

  ## Complete Service List (25 items)
  Sorted for optimal display order.
*/

-- Step 1: Make the FK safe for a clean re-seed
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_service_id_fkey;
ALTER TABLE invoice_items
  ADD CONSTRAINT invoice_items_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

-- Step 2: Clear existing data
DELETE FROM services;

-- Step 3: Re-insert the complete, verified service catalog
INSERT INTO services (name_en, name_ar, wash_iron_price, iron_only_price, requires_inspection, sort_order) VALUES

  -- User-provided entries (exact names & prices)
  ('Thobe',        'ثوب',              0.500, 0.150, false,  1),
  ('Abaya',        'عباية بالبخار',    1.000, 0.500, false,  2),
  ('Ghutra',       'غترة',             0.400, 0.200, false,  3),
  ('Formal Suit',  'بدلة رسمية',       1.500, 0.800, false,  4),
  ('Shirt',        'قميص',             0.600, 0.400, false,  5),

  -- Remaining catalog (from original specification)
  ('Sheila / Hijab',         'شيلة - حجاب',              0.200, 0.200, false,  6),
  ('Winter Thobe',           'ثوب شتوي',                 0.600, 0.200, false,  7),
  ('Bisht',                  'بشت',                      1.000, 0.500, false,  8),
  ('Official Uniform',       'بدلة وزارة الداخلية',      1.000, 0.400, false,  9),
  ('Long Pants',             'بنطلون طويل',              0.600, 0.300, false, 10),
  ('Short Pants',            'بنطلون قصير',              0.400, 0.200, false, 11),
  ('Skirt (Long/Short)',     'تنورة قصير - طويل',        0.600, 0.300, false, 12),
  ('Undershirt',             'فانيلة',                   0.400, 0.200, false, 13),
  ('Jacket (Steam)',         'جاكيت بخار',               0.800,  NULL, false, 14),
  ('Dress',                  'فستان',                     NULL,  NULL, true,  15),
  ('Bath Towel',             'فوطة استجمام',              0.600,  NULL, false, 16),
  ('Bed Sheet (Single)',     'غطاء سرير فردي',            0.500,  NULL, false, 17),
  ('Bed Sheet (Double)',     'غطاء سرير مزدوج',           0.800,  NULL, false, 18),
  ('Blanket (Large)',        'بطانية كبيرة',              2.000,  NULL, false, 19),
  ('Blanket (Small)',        'بطانية صغيرة',              1.500,  NULL, false, 20),
  ('Pillow Case',            'غطاء مخدة',                0.200,  NULL, false, 21),
  ('Socks',                  'جوارب',                    0.100,  NULL, false, 22),
  ('Carpet / Curtain 2m',   'سجاد / ستارة 2م',           1.000,  NULL, false, 23),
  ('Shoes',                  'حذاء',                     2.000,  NULL, false, 24),
  ('School Bag',             'شنطة مدرسية',               1.000,  NULL, false, 25);
