-- تأكد من وجود جدول الطلبات بهذا الشكل
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  customer_name text,
  phone_number text,
  service_type text,
  status text DEFAULT 'pending',
  total_price decimal(10,3) -- ليتناسب مع الدينار البحريني BHD
);

-- تفعيل الوصول العام للقراءة (مؤقتاً للإصلاح)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON orders FOR INSERT WITH CHECK (true);
