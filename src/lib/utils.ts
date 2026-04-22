import { InvoiceItem, Invoice } from './types';

export function formatPrice(amount: number): string {
  return amount.toFixed(3);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildWhatsAppMessage(invoice: Invoice, items: InvoiceItem[]): string {
  const date = new Date(invoice.created_at).toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const serviceLines = items
    .map((item) => {
      const typeLabel = item.service_type === 'iron_only'
        ? '(Iron | كي)'
        : item.service_type === 'wash_iron'
        ? '(Wash+Iron | غسيل+كي)'
        : '(Inspection | معاينة)';
      const fastTag = item.is_fast ? ' ⚡ مستعجل | Fast ×2' : '';
      return `• ${item.service_name_en} | ${item.service_name_ar} ${typeLabel}${fastTag} × ${item.quantity} = ${formatPrice(item.total_price)} BHD`;
    })
    .join('\n');

  const fastServiceLine = '';

  const discountLine =
    invoice.discount > 0
      ? `\nDiscount | الخصم: -${formatPrice(invoice.discount)} BHD`
      : '';

  return `*Premium Service Laundry | مغسلة الخدمة المميزة* 🧺

Invoice | فاتورة: #${invoice.invoice_number}
Customer | العميل: ${invoice.customer_name}
Date | التاريخ: ${date}
━━━━━━━━━━━━━━━━━━━━━━━
*Services | الخدمات:*
${serviceLines}${fastServiceLine}
━━━━━━━━━━━━━━━━━━━━━━━
Subtotal | المجموع: ${formatPrice(invoice.subtotal)} BHD${discountLine}
*Total | الإجمالي: ${formatPrice(invoice.total)} BHD*

Thank you for choosing us! | شكراً لاختياركم خدماتنا 🌟`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `INV-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Date.now().toString().slice(-4)}`;
}

export function formatWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('973')) return digits;
  if (digits.startsWith('00973')) return digits.slice(2);
  return `973${digits}`;
}
