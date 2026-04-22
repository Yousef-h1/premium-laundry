import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../lib/types';
import { formatPrice, buildWhatsAppMessage, formatWhatsAppPhone } from '../lib/utils';

export function OrdersPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, InvoiceItem[]>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(
    (inv) =>
      inv.customer_name.includes(search) ||
      inv.customer_phone.includes(search) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!itemsMap[id]) {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
      if (data) setItemsMap((prev) => ({ ...prev, [id]: data }));
    }
  };

  const sendWhatsApp = (inv: Invoice) => {
    const items = itemsMap[inv.id] || [];
    const msg = buildWhatsAppMessage(inv, items);
    const phone = formatWhatsAppPhone(inv.customer_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const statusMap: Record<string, { ar: string; en: string; bg: string; color: string }> = {
    unpaid: { ar: 'غير مدفوع', en: 'Unpaid', bg: '#fee2e2', color: '#dc2626' },
    paid_cash: { ar: 'كاش', en: 'Cash', bg: '#dcfce7', color: '#16a34a' },
    paid_benefit: { ar: 'بنفت', en: 'Benefit', bg: '#dbeafe', color: '#2563eb' },
    cancelled: { ar: 'ملغي', en: 'Cancelled', bg: '#f3f4f6', color: '#6b7280' },
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#f1f3f5' }}>
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3"
        style={{ background: 'white', borderBottom: '1px solid #e9ecef' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 20, color: '#1a4d6e', margin: 0 }}>
              الطلبات
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: 0 }}>Orders ({invoices.length})</p>
          </div>
          <button
            onClick={load}
            style={{ background: '#f1f3f5', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={16} color="#6c757d" />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute" style={{ top: 12, right: 12, color: '#9ca3af' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم العميل أو رقم الفاتورة | Search"
            style={{
              width: '100%', padding: '10px 32px 10px 12px', border: '1.5px solid #e9ecef',
              borderRadius: 12, fontFamily: 'Tajawal', fontSize: 14, background: '#f8f9fa',
              outline: 'none', color: '#212529', direction: 'rtl',
            }}
          />
        </div>
      </div>

      <div className="flex-1 scrollable p-4 space-y-3">
        {loading ? (
          <div className="py-8 text-center" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>لا توجد طلبات | No orders</div>
        ) : (
          filtered.map((inv) => {
            const isExp = expanded === inv.id;
            const s = statusMap[inv.status] || statusMap.unpaid;
            const items = itemsMap[inv.id] || [];

            return (
              <div
                key={inv.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <button
                  onClick={() => toggleExpand(inv.id)}
                  className="w-full text-right px-4 py-3 flex items-center gap-3"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#212529' }}>
                        {inv.customer_name || 'عميل'}
                      </span>
                      <span
                        style={{
                          background: s.bg, color: s.color, fontFamily: 'Tajawal', fontWeight: 700,
                          fontSize: 10, padding: '2px 8px', borderRadius: 20,
                        }}
                      >
                        {s.ar} | {s.en}
                      </span>
                      {inv.is_fast_service && (
                        <span style={{ fontSize: 11, color: '#d97706' }}>⚡</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af' }}>#{inv.invoice_number}</span>
                      {inv.customer_phone && (
                        <>
                          <span style={{ color: '#dee2e6' }}>·</span>
                          <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af', direction: 'ltr' }}>{inv.customer_phone}</span>
                        </>
                      )}
                    </div>
                    <span style={{ fontFamily: 'Tajawal', fontSize: 11, color: '#9ca3af' }}>
                      {new Date(inv.created_at).toLocaleDateString('ar-KW', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-left flex-shrink-0 flex flex-col items-end gap-1">
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: inv.is_fast_service ? '#d97706' : '#1a4d6e' }}>
                      {formatPrice(inv.total)} BHD
                    </span>
                    {isExp ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                  </div>
                </button>

                {isExp && (
                  <div style={{ borderTop: '1px solid #f1f3f5' }}>
                    <div className="px-4 py-3 space-y-2">
                      {items.length === 0 ? (
                        <div className="text-center py-2" style={{ color: '#9ca3af', fontFamily: 'Tajawal', fontSize: 13 }}>جارٍ التحميل...</div>
                      ) : (
                        items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #f8f9fa' }}>
                            <div>
                              <span style={{ fontFamily: 'Tajawal', fontWeight: 600, fontSize: 13, color: '#212529' }}>
                                {item.service_name_ar}
                              </span>
                              <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af' }}> | {item.service_name_en}</span>
                              <br />
                              <span style={{ fontFamily: 'Tajawal', fontSize: 11, color: '#6c757d' }}>
                                {item.service_type === 'wash_iron' ? 'غسيل+كي' : item.service_type === 'iron_only' ? 'كي فقط' : 'معاينة'}
                                {' '}×{item.quantity}
                              </span>
                            </div>
                            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#1a4d6e' }}>
                              {formatPrice(item.total_price)} BHD
                            </span>
                          </div>
                        ))
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          {inv.discount > 0 && (
                            <div style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#dc2626' }}>
                              خصم | Discount: -{formatPrice(inv.discount)} BHD
                            </div>
                          )}
                          <div style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#1a4d6e' }}>
                            الإجمالي | Total: {formatPrice(inv.total)} BHD
                          </div>
                        </div>
                        {inv.customer_phone && (
                          <button
                            onClick={() => sendWhatsApp(inv)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-bold"
                            style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }}
                          >
                            <MessageCircle size={14} />
                            واتساب
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}
