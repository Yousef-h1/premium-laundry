import { useState, useEffect, useCallback } from 'react';
import { Users, ShoppingBag, RefreshCw, MessageCircle, CheckCircle, XCircle, CreditCard as Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../lib/types';
import { formatPrice, buildWhatsAppMessage, formatWhatsAppPhone } from '../lib/utils';
import { Modal } from '../components/Modal';

export function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [editModal, setEditModal] = useState<Invoice | null>(null);
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [cashInput, setCashInput] = useState('');
  const [paying, setPaying] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, InvoiceItem[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingInvoices = invoices.filter((inv) => inv.status === 'unpaid');

  const todaySales = invoices
    .filter((inv) =>
      (inv.status === 'paid_cash' || inv.status === 'paid_benefit') &&
      (inv.paid_at ? inv.paid_at.startsWith(todayStr) : inv.created_at.startsWith(todayStr))
    )
    .reduce((s, inv) => s + inv.total, 0);

  const todayOrders = invoices.filter((inv) => inv.created_at.startsWith(todayStr)).length;

  const uniqueCustomers = new Set(
    invoices
      .filter((inv) => inv.customer_phone && inv.customer_phone.trim())
      .map((inv) => inv.customer_phone)
  ).size;

  const sortedInvoices = [...invoices].sort((a, b) => {
    const aUnpaid = a.status === 'unpaid' ? 0 : 1;
    const bUnpaid = b.status === 'unpaid' ? 0 : 1;
    if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!itemsMap[id]) {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
      if (data) setItemsMap((prev) => ({ ...prev, [id]: data }));
    }
  };

  const handleResend = async (inv: Invoice) => {
    if (!inv.customer_phone) return;
    let items = itemsMap[inv.id];
    if (!items) {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
      items = data || [];
      if (data) setItemsMap((prev) => ({ ...prev, [inv.id]: data }));
    }
    const msg = buildWhatsAppMessage(inv, items);
    const phone = formatWhatsAppPhone(inv.customer_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openPayModal = (inv: Invoice) => {
    setPayModal(inv);
    setBenefitInput('');
    setCashInput('');
  };

  const handlePay = async () => {
    if (!payModal) return;
    const benefit = parseFloat(benefitInput) || 0;
    const cash = parseFloat(cashInput) || 0;
    if (benefit + cash === 0) return;
    setPaying(true);
    const status = benefit > 0 && cash === 0 ? 'paid_benefit' : 'paid_cash';
    await supabase
      .from('invoices')
      .update({
        status,
        payment_method: benefit > 0 && cash > 0 ? 'split' : benefit > 0 ? 'benefit' : 'cash',
        benefit_amount: benefit,
        cash_amount: cash,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payModal.id);
    setPaying(false);
    setPayModal(null);
    load();
  };

  const openEditModal = async (inv: Invoice) => {
    setEditModal(inv);
    if (!itemsMap[inv.id]) {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
      if (data) {
        setItemsMap((prev) => ({ ...prev, [inv.id]: data }));
        setEditItems(data as InvoiceItem[]);
      }
    } else {
      setEditItems([...itemsMap[inv.id]]);
    }
  };

  const handleCancelInvoice = async (inv: Invoice) => {
    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', inv.id);
    setEditModal(null);
    load();
  };

  const handleEditItemPrice = (itemId: string, val: string) => {
    const price = parseFloat(val);
    if (isNaN(price)) return;
    setEditItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, unit_price: price, total_price: price * i.quantity } : i
      )
    );
  };

  const handleEditItemQty = (itemId: string, delta: number) => {
    setEditItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty, total_price: i.unit_price * newQty };
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setEditItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    const newSubtotal = editItems.reduce((s, i) => s + i.total_price, 0);
    const newTotal = Math.max(0, newSubtotal - editModal.discount);
    for (const item of editItems) {
      await supabase
        .from('invoice_items')
        .update({ quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price })
        .eq('id', item.id!);
    }
    await supabase.from('invoices').update({ subtotal: newSubtotal, total: newTotal }).eq('id', editModal.id);
    setItemsMap((prev) => ({ ...prev, [editModal.id]: editItems }));
    setEditModal(null);
    load();
  };

  const benefit = parseFloat(benefitInput) || 0;
  const cash = parseFloat(cashInput) || 0;
  const payTotal = benefit + cash;

  return (
    <div className="flex flex-col h-full" style={{ background: '#f1f3f5' }}>
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ background: 'white', borderBottom: '1px solid #e9ecef' }}
      >
        <div>
          <h1 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 20, color: '#1a4d6e', margin: 0 }}>لوحة التحكم</h1>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: 0 }}>Dashboard</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ background: '#f1f3f5', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={16} color="#6c757d" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#6c757d' }}>تحديث</span>
        </button>
      </div>

      <div className="flex-1 scrollable p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 w-full">
          <KpiCard
            labelAr="فواتير قيد التنفيذ"
            labelEn="Pending Invoices"
            value={String(pendingInvoices.length)}
            sub={`${pendingInvoices.reduce((s, i) => s + i.total, 0).toFixed(3)} BHD`}
            icon={<ShoppingBag size={24} />}
            color="#dc2626"
            bg="#fee2e2"
          />
          <KpiCard
            labelAr="مبيعات اليوم"
            labelEn="Today's Sales"
            value={`${todaySales.toFixed(3)}`}
            sub="كاش + بنفت | Cash + Benefit"
            icon={<Users size={24} />}
            color="#16a34a"
            bg="#dcfce7"
          />
          <KpiCard
            labelAr="طلبات اليوم"
            labelEn="Today's Orders"
            value={String(todayOrders)}
            sub="إجمالي الفواتير | Total Invoices"
            icon={<ShoppingBag size={24} />}
            color="#2563eb"
            bg="#dbeafe"
          />
          <KpiCard
            labelAr="إجمالي العملاء"
            labelEn="Total Customers"
            value={String(uniqueCustomers)}
            sub="عملاء فريدين | Unique Customers"
            icon={<Users size={24} />}
            color="#c9a227"
            bg="#fef3c7"
          />
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f3f5' }}>
            <h2 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#1a4d6e', margin: 0 }}>
              آخر الطلبات | Recent Orders
            </h2>
            <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
              Unpaid orders shown first
            </p>
          </div>
          {loading ? (
            <div className="py-8 text-center" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>جارٍ التحميل...</div>
          ) : sortedInvoices.length === 0 ? (
            <div className="py-8 text-center" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>لا توجد طلبات | No orders yet</div>
          ) : (
            <div>
              {sortedInvoices.slice(0, 30).map((inv) => (
                <OrderCard
                  key={inv.id}
                  inv={inv}
                  items={itemsMap[inv.id] || []}
                  isExpanded={expandedId === inv.id}
                  onToggle={() => toggleExpand(inv.id)}
                  onResend={() => handleResend(inv)}
                  onPay={() => openPayModal(inv)}
                  onEdit={() => openEditModal(inv)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-2" />
      </div>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="دفع الفاتورة | Pay Invoice">
        {payModal && (
          <div className="p-5 space-y-4">
            <div className="rounded-2xl p-4 text-center" style={{ background: '#f8f9fa' }}>
              <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#212529', margin: 0 }}>
                {payModal.customer_name}
              </p>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                #{payModal.invoice_number}
              </p>
              {payModal.customer_phone && (
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#6c757d', margin: '2px 0 0', direction: 'ltr' }}>
                  +973 {payModal.customer_phone}
                </p>
              )}
              <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 22, color: '#1a4d6e', margin: '6px 0 0' }}>
                {formatPrice(payModal.total)} BHD
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <label style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#2563eb', display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  مبلغ بنفت | Benefit Amount (BHD)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  placeholder="0.000"
                  style={{
                    width: '100%', padding: '11px 12px', border: '2px solid #bfdbfe',
                    borderRadius: 12, fontFamily: 'Inter', fontSize: 16, textAlign: 'center',
                    outline: 'none', color: '#2563eb', fontWeight: 700, boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#16a34a', display: 'block', marginBottom: 4, fontWeight: 700 }}>
                  مبلغ كاش | Cash Amount (BHD)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="0.000"
                  style={{
                    width: '100%', padding: '11px 12px', border: '2px solid #bbf7d0',
                    borderRadius: 12, fontFamily: 'Inter', fontSize: 16, textAlign: 'center',
                    outline: 'none', color: '#16a34a', fontWeight: 700, boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {payTotal > 0 && (
              <div className="rounded-xl p-3 flex justify-between items-center"
                style={{
                  background: payTotal >= payModal.total ? '#dcfce7' : '#fef3c7',
                  border: `1px solid ${payTotal >= payModal.total ? '#bbf7d0' : '#fde68a'}`,
                }}>
                <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, color: payTotal >= payModal.total ? '#16a34a' : '#92400e' }}>
                  {payTotal >= payModal.total ? 'مكتمل | Complete' : `متبقي: ${formatPrice(payModal.total - payTotal)} BHD`}
                </span>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: payTotal >= payModal.total ? '#16a34a' : '#d97706' }}>
                  {formatPrice(payTotal)} BHD
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPayModal(null)}
                style={{ flex: 1, padding: 12, border: '1.5px solid #dee2e6', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, background: 'white', cursor: 'pointer', color: '#6c757d' }}
              >
                إلغاء
              </button>
              <button
                onClick={handlePay}
                disabled={paying || payTotal === 0}
                style={{
                  flex: 2, padding: 12, border: 'none', borderRadius: 12,
                  fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14,
                  cursor: paying || payTotal === 0 ? 'not-allowed' : 'pointer',
                  background: paying || payTotal === 0 ? '#dee2e6' : 'linear-gradient(135deg,#16a34a,#15803d)',
                  color: paying || payTotal === 0 ? '#9ca3af' : 'white',
                }}
              >
                {paying ? 'جارٍ الدفع...' : 'تأكيد الدفع | Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="تعديل الفاتورة | Edit Invoice">
        {editModal && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-3 text-center" style={{ background: '#f8f9fa' }}>
              <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, color: '#1a4d6e', margin: 0 }}>
                {editModal.customer_name} · #{editModal.invoice_number}
              </p>
            </div>

            <div className="space-y-2">
              {editItems.map((item) => (
                <div key={item.id} className="rounded-xl p-3 flex items-center gap-2"
                  style={{ background: item.is_fast ? '#fffbeb' : '#f8f9fa', border: `1px solid ${item.is_fast ? '#fde68a' : '#e9ecef'}` }}>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 12, color: '#1a4d6e', margin: 0 }}>
                      {item.service_name_ar}
                      {item.is_fast && <span style={{ color: '#d97706', marginRight: 4 }}>⚡</span>}
                    </p>
                    <p style={{ fontFamily: 'Inter', fontSize: 10, color: '#9ca3af', margin: 0 }}>
                      {item.service_type === 'wash_iron' ? 'غسيل+كي' : item.service_type === 'iron_only' ? 'كي فقط' : 'معاينة'}
                      {item.is_fast && ' | Fast'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditItemQty(item.id!, -1)}
                      style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #dee2e6', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      -
                    </button>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#212529', minWidth: 20, textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button onClick={() => handleEditItemQty(item.id!, 1)}
                      style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #dee2e6', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      +
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    value={item.unit_price}
                    onChange={(e) => handleEditItemPrice(item.id!, e.target.value)}
                    style={{
                      width: 70, padding: '5px 6px', border: '1.5px solid #c9a227',
                      borderRadius: 8, fontFamily: 'Inter', fontSize: 12, textAlign: 'center',
                      outline: 'none', color: '#d97706', background: '#fefce8',
                    }}
                  />
                  <button onClick={() => handleRemoveItem(item.id!)}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '5px 7px', cursor: 'pointer' }}>
                    <XCircle size={13} color="#dc2626" />
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-3 flex justify-between"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, color: '#1a4d6e' }}>
                الإجمالي | Total
              </span>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: '#1a4d6e' }}>
                {formatPrice(Math.max(0, editItems.reduce((s, i) => s + i.total_price, 0) - editModal.discount))} BHD
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCancelInvoice(editModal)}
                style={{
                  flex: 1, padding: 11, border: 'none', borderRadius: 12,
                  fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13,
                  background: '#fee2e2', color: '#dc2626', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <XCircle size={15} />
                إلغاء الفاتورة
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  flex: 2, padding: 11, border: 'none', borderRadius: 12,
                  fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13,
                  background: 'linear-gradient(135deg,#1a4d6e,#2a6d9e)', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <CheckCircle size={15} />
                حفظ | Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function KpiCard({ labelAr, labelEn, value, sub, icon, color, bg }: {
  labelAr: string; labelEn: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: 160,
      }}
    >
      <div
        className="rounded-xl flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          background: bg,
          color,
          position: 'absolute',
          top: 12,
          right: 12,
        }}
      >
        {icon}
      </div>

      <div style={{ paddingRight: 60 }}>
        <p
          style={{
            fontFamily: 'Tajawal',
            fontWeight: 700,
            fontSize: 12,
            color: '#6c757d',
            margin: '0 0 8px 0',
            lineHeight: 1.3,
          }}
        >
          {labelAr}
        </p>
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: 10,
            color: '#9ca3af',
            margin: 0,
          }}
        >
          {labelEn}
        </p>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <p
          style={{
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 26,
            color: color,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              fontFamily: 'Tajawal',
              fontSize: 9,
              color: '#9ca3af',
              margin: '4px 0 0 0',
              lineHeight: 1.3,
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { ar: string; en: string; bg: string; color: string }> = {
    unpaid: { ar: 'غير مدفوع', en: 'Unpaid', bg: '#fee2e2', color: '#dc2626' },
    paid_cash: { ar: 'كاش', en: 'Cash', bg: '#dcfce7', color: '#16a34a' },
    paid_benefit: { ar: 'بنفت', en: 'Benefit', bg: '#dbeafe', color: '#2563eb' },
    cancelled: { ar: 'ملغي', en: 'Cancelled', bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = map[status] || map.unpaid;
  return (
    <span style={{ background: s.bg, color: s.color, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
      {s.ar} | {s.en}
    </span>
  );
}

interface OrderCardProps {
  inv: Invoice;
  items: InvoiceItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onResend: () => void;
  onPay: () => void;
  onEdit: () => void;
}

function OrderCard({ inv, items, isExpanded, onToggle, onResend, onPay, onEdit }: OrderCardProps) {
  const isCancelled = inv.status === 'cancelled';
  const isUnpaid = inv.status === 'unpaid';

  return (
    <div style={{ borderBottom: '1px solid #f1f3f5', borderRight: isUnpaid ? '3px solid #dc2626' : 'none' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center px-4 py-3 gap-3 text-right"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, color: isCancelled ? '#9ca3af' : '#212529' }}>
              {inv.customer_name || 'عميل'}
            </span>
            <StatusBadge status={inv.status} />
            {inv.is_fast_service && <span style={{ fontSize: 11, color: '#d97706' }}>⚡</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#6c757d', fontWeight: 600 }}>#{inv.invoice_number}</span>
            {inv.customer_phone && (
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af', direction: 'ltr' }}>
                +973 {inv.customer_phone}
              </span>
            )}
            <span style={{ fontFamily: 'Tajawal', fontSize: 10, color: '#9ca3af' }}>
              {new Date(inv.created_at).toLocaleDateString('ar-KW', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: isCancelled ? '#9ca3af' : isUnpaid ? '#dc2626' : '#1a4d6e' }}>
            {formatPrice(inv.total)} BHD
          </span>
          {isExpanded ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-3" style={{ borderTop: '1px solid #f8f9fa' }}>
          {items.length > 0 && (
            <div className="space-y-1 pt-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between py-1.5 px-2 rounded-lg"
                  style={{ background: item.is_fast ? '#fffbeb' : 'transparent', borderBottom: '1px solid #f8f9fa' }}>
                  <div>
                    <span style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#212529' }}>{item.service_name_ar}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#9ca3af' }}>
                      {' '}| {item.service_name_en}
                    </span>
                    <span style={{ fontFamily: 'Tajawal', fontSize: 11, color: '#9ca3af' }}>
                      {' '}×{item.quantity}
                      {' '}({item.service_type === 'wash_iron' ? 'غسيل+كي' : item.service_type === 'iron_only' ? 'كي' : 'معاينة'})
                    </span>
                    {item.is_fast && <span style={{ fontFamily: 'Tajawal', fontSize: 10, color: '#d97706', fontWeight: 700 }}> ⚡ مستعجل | Fast</span>}
                  </div>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: item.is_fast ? '#d97706' : '#1a4d6e' }}>
                    {formatPrice(item.total_price)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isCancelled && (
            <div className="flex gap-2">
              {inv.customer_phone && (
                <button
                  onClick={onResend}
                  className="flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold flex-1"
                  style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)', border: 'none', cursor: 'pointer', color: 'white', fontFamily: 'Tajawal', fontSize: 12 }}
                >
                  <MessageCircle size={13} />
                  واتساب | WhatsApp
                </button>
              )}
              {isUnpaid && (
                <button
                  onClick={onPay}
                  className="flex items-center justify-center gap-1 py-2.5 rounded-xl font-bold flex-1"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', border: 'none', cursor: 'pointer', color: 'white', fontFamily: 'Tajawal', fontSize: 12 }}
                >
                  <CheckCircle size={13} />
                  دفع | Pay
                </button>
              )}
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl font-bold"
                style={{ background: '#fff7ed', border: '1px solid #fed7aa', cursor: 'pointer', color: '#c9a227', fontFamily: 'Tajawal', fontSize: 12 }}
              >
                <Edit2 size={13} />
                تعديل | Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
