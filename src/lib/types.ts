export interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  wash_iron_price: number | null;
  iron_only_price: number | null;
  requires_inspection: boolean;
  sort_order: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  is_credit: boolean;
  notes: string;
  created_at: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  service_id: string | null;
  service_name_en: string;
  service_name_ar: string;
  service_type: 'wash_iron' | 'iron_only' | 'inspection';
  quantity: number;
  unit_price: number;
  total_price: number;
  is_fast?: boolean;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  is_fast_service: boolean;
  discount: number;
  subtotal: number;
  total: number;
  status: 'unpaid' | 'paid_cash' | 'paid_benefit' | 'cancelled';
  payment_method: string | null;
  notes: string;
  created_at: string;
  paid_at: string | null;
  invoice_items?: InvoiceItem[];
}

export type Page = 'dashboard' | 'new-order' | 'unpaid' | 'expenses' | 'reports';
