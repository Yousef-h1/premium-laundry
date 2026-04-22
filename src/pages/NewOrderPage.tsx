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
      inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f8f9fa' }}>
      
      <header className="flex-shrink-0 z-20 shadow-sm" style={{ background: 'white' }}>
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 22, color: '#1a4d6e', margin: 0 }}>
                الطلبات
              </h1>
              <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#9ca3af', margin: 0 }}>
                Orders ({invoices.length})
              </p>
            </div>
            <button
              onClick={load}
              className="active:scale-95 transition-transform"
              style={{ background: '#f1f3f5', border: 'none', borderRadius: 12, padding: '10px', cursor: 'pointer' }}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} color="#1a4d6e" />
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute" style={{ top: '50%', right: 12, transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العميل أو الرقم..."
              style={{
                width: '100%', padding: '12px 38px 12px 12px', border: '1.5px solid #eee',
                borderRadius: 14, fontFamily: 'Tajawal', fontSize: 15, background: '#f8f9fa',
                outline: 'none', color: '#212529', direction: 'rtl'
              }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a4d6e]"></div>
            <span style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>جارٍ جلب البيانات...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>
            لا توجد نتائج مطابقة
          </div>
        ) : (
          filtered.map((inv) => {
            const isExp = expanded === inv.id;
            const s = statusMap[inv.status] || statusMap.unpaid;
            const items = itemsMap[inv.id] || [];

            return (
              <div
                key={inv.id}
                className="rounded-2xl border border-gray-100 transition-all"
                style={{ background: 'white', boxShadow: isExp ? '0 8px 20px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.04)' }}
              >
                <button
                  onClick={() => toggleExpand(inv.id)}
                  className="w-full text-right px-4 py-4 flex items-center justify-between gap-3"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#2d3436' }}>
                        {inv.customer_name || 'عميل نقدي'}
                      </span>
                      {inv.is_fast_service && <span>⚡</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">#{inv.invoice_number}</span>
                      <span>•</span>
                      <span style={{ fontFamily: 'Tajawal' }}>
                         {new Date(inv.created_at).toLocaleDateString('ar-BH', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-left flex flex-col items-end gap-2">
                    <span
                      style={{
                        background: s.bg, color: s.color, fontFamily: 'Tajawal', fontWeight: 800,
                        fontSize: 10, padding: '3px 10px', borderRadius: 8,
                      }}
                    >
                      {s.ar}
                    </span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: '#1a4d6e' }}>
                      {formatPrice(inv.total)} <small className="text-[10px]">BHD</small>
                    </span>
                  </div>
                  {isExp ? <ChevronUp size={18} className="text-gray-300" /> : <ChevronDown size={18} className="text-gray-300" />}
                </button>

                {isExp && (
                  <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-gray-50 rounded-xl p-3 space-y-3 mb-4">
                      {items.length === 0 ? (
                        <div className="text-center py-2 text-xs text-gray-400">جارٍ التحميل...</div>
                      ) : (
                        items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                            <div className="flex-1">
                              {/* هنا يتم عرض الخدمة باللغتين كما سحبتها من الكود القديم */}
                              <div className="font-bold text-gray-700">
                                {item.service_name_ar} 
                                <span className="text-[10px] text-gray-400 font-normal mr-1">| {item.service_name_en}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.service_type === 'wash_iron' ? 'غسيل وكي' : 'كي فقط'} × {item.quantity}
                              </div>
                            </div>
                            <div className="font-bold text-[#1a4d6e]">{formatPrice(item.total_price)}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                      <div className="space-y-1">
                        {inv.discount > 0 && (
                          <div className="text-xs text-red-500 font-bold">الخصم: -{formatPrice(inv.discount)} BHD</div>
                        )}
                        <div className="text-lg font-black text-[#1a4d6e]" style={{ fontFamily: 'Tajawal' }}>
                          الإجمالي: {formatPrice(inv.total)} BHD
                        </div>
                      </div>
                      
                      {inv.customer_phone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); sendWhatsApp(inv); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white active:scale-95 transition-all shadow-md"
                          style={{ background: '#25D366', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14 }}
                        >
                          <MessageCircle size={18} />
                          إرسال واتساب
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
