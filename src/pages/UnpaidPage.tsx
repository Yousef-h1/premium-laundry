import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, MessageCircle, RefreshCw, Users, Search, History, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice } from '../lib/types';
import { formatPrice, buildWhatsAppMessage, formatWhatsAppPhone } from '../lib/utils';
import { Modal } from '../components/Modal';

interface PhoneReport {
  phone: string;
  name: string;
  paid: Invoice[];
  unpaid: Invoice[];
  totalPaid: number;
  totalUnpaid: number;
}

export function UnpaidPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('individual');
  const [confirmModal, setConfirmModal] = useState<{ inv: Invoice; method: 'cash' | 'benefit' | 'cancel' } | null>(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneReport, setPhoneReport] = useState<PhoneReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'unpaid')
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearchHistory = async () => {
    if (!phoneSearch.trim()) return;
    setReportLoading(true);
    setShowReport(true);

    const { data } = await supabase
      .from('invoices')
      .select('*')
      .ilike('customer_phone', `%${phoneSearch.trim()}%`)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const all = data as Invoice[];
      const paid = all.filter((i) => i.status === 'paid_cash' || i.status === 'paid_benefit');
      const unpaid = all.filter((i) => i.status === 'unpaid');
      setPhoneReport({
        phone: phoneSearch.trim(),
        name: all[0]?.customer_name || '',
        paid,
        unpaid,
        totalPaid: paid.reduce((s, i) => s + i.total, 0),
        totalUnpaid: unpaid.reduce((s, i) => s + i.total, 0),
      });
    } else {
      setPhoneReport({ phone: phoneSearch, name: '', paid: [], unpaid: [], totalPaid: 0, totalUnpaid: 0 });
    }

    setReportLoading(false);
  };

  const filteredInvoices = phoneSearch.trim()
    ? invoices.filter(
        (i) =>
          i.customer_phone?.includes(phoneSearch.trim()) ||
          i.customer_name?.toLowerCase().includes(phoneSearch.trim().toLowerCase())
      )
    : invoices;

  const handlePay = async (inv: Invoice, method: 'cash' | 'benefit') => {
    setProcessing(inv.id);
    await supabase
      .from('invoices')
      .update({
        status: method === 'cash' ? 'paid_cash' : 'paid_benefit',
        payment_method: method,
        paid_at: new Date().toISOString(),
      })
      .eq('id', inv.id);
    setProcessing(null);
    setConfirmModal(null);
    load();
  };

  const handleCancel = async (inv: Invoice) => {
    setProcessing(inv.id);
    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', inv.id);
    setProcessing(null);
    setConfirmModal(null);
    load();
  };

  const handleResend = async (inv: Invoice) => {
    if (!inv.customer_phone) return;
    const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    const msg = buildWhatsAppMessage(inv, items || []);
    const phone = formatWhatsAppPhone(inv.customer_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const grouped = filteredInvoices.reduce<Record<string, Invoice[]>>((acc, inv) => {
    const key = inv.customer_phone || inv.customer_name || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {});

  const totalUnpaid = invoices.reduce((s, i) => s + i.total, 0);

  return (
    <div className="flex flex-col h-full" style={{ background: '#f1f3f5' }}>
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3"
        style={{ background: 'white', borderBottom: '1px solid #e9ecef' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 20, color: '#dc2626', margin: 0 }}>
              غير مدفوعة
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: 0 }}>Unpaid Invoices</p>
          </div>
          <button
            onClick={load}
            style={{ background: '#f1f3f5', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} color="#6c757d" />
          </button>
        </div>

        <div
          className="rounded-2xl p-3 flex items-center justify-between"
          style={{ background: '#fee2e2', border: '1px solid #fecaca' }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={20} color="#dc2626" />
            <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, color: '#dc2626' }}>
              {invoices.length} فاتورة معلقة | Pending
            </span>
          </div>
          <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: '#dc2626' }}>
            {formatPrice(totalUnpaid)} BHD
          </span>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={13} style={{ position: 'absolute', top: 12, right: 10, color: '#9ca3af', zIndex: 1 }} />
            <input
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchHistory()}
              placeholder="بحث برقم الهاتف أو الاسم | Search"
              style={{
                width: '100%', padding: '10px 30px 10px 10px', border: '1.5px solid #e9ecef',
                borderRadius: 12, fontFamily: 'Tajawal', fontSize: 13, background: '#f8f9fa',
                outline: 'none', color: '#212529', direction: 'rtl',
              }}
            />
            {phoneSearch && (
              <button
                onClick={() => { setPhoneSearch(''); setShowReport(false); setPhoneReport(null); }}
                style={{ position: 'absolute', top: 10, left: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, zIndex: 1 }}
              >
                <X size={14} color="#9ca3af" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearchHistory}
            style={{
              flexShrink: 0, padding: '10px 12px', border: 'none', borderRadius: 12, cursor: 'pointer',
              background: 'linear-gradient(135deg,#1a4d6e,#2a6d9e)', color: 'white',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 12,
            }}
          >
            <History size={14} />
            السجل
          </button>
        </div>

        {showReport && (
          <PhoneHistoryReport
            report={phoneReport}
            loading={reportLoading}
            onClose={() => { setShowReport(false); setPhoneReport(null); }}
          />
        )}

        {!showReport && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('individual')}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{
                fontFamily: 'Tajawal', border: 'none', cursor: 'pointer',
                background: viewMode === 'individual' ? '#1a4d6e' : '#f1f3f5',
                color: viewMode === 'individual' ? 'white' : '#6c757d',
              }}
            >
              فردي | Individual
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className="flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
              style={{
                fontFamily: 'Tajawal', border: 'none', cursor: 'pointer',
                background: viewMode === 'grouped' ? '#1a4d6e' : '#f1f3f5',
                color: viewMode === 'grouped' ? 'white' : '#6c757d',
              }}
            >
              <Users size={14} />
              مجمع | Grouped
            </button>
          </div>
        )}
      </div>

      {!showReport && (
        <div className="flex-1 scrollable p-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>جارٍ التحميل...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle size={48} color="#16a34a" className="mx-auto" />
              <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#16a34a' }}>
                {phoneSearch ? 'لا توجد نتائج | No results' : 'لا توجد فواتير معلقة!'}
              </p>
              <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#9ca3af' }}>
                {phoneSearch ? 'Try a different search term' : 'All invoices are cleared'}
              </p>
            </div>
          ) : viewMode === 'individual' ? (
            filteredInvoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                inv={inv}
                processing={processing}
                onPay={(method) => setConfirmModal({ inv, method })}
                onCancel={() => setConfirmModal({ inv, method: 'cancel' })}
                onResend={() => handleResend(inv)}
              />
            ))
          ) : (
            Object.entries(grouped).map(([key, invs]) => {
              const groupTotal = invs.reduce((s, i) => s + i.total, 0);
              const name = invs[0].customer_name || 'عميل';
              const phone = invs[0].customer_phone;

              return (
                <div key={key} className="rounded-2xl overflow-hidden"
                  style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div className="px-4 py-3 flex items-center justify-between"
                    style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                    <div>
                      <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#1a4d6e' }}>{name}</span>
                      {phone && (
                        <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: 0, direction: 'ltr' }}>{phone}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: '#c9a227' }}>
                        {formatPrice(groupTotal)} BHD
                      </span>
                      <p style={{ fontFamily: 'Tajawal', fontSize: 11, color: '#9ca3af', margin: 0 }}>
                        {invs.length} فاتورة | invoices
                      </p>
                    </div>
                  </div>
                  {invs.map((inv) => (
                    <div key={inv.id} className="px-4 py-3" style={{ borderBottom: '1px solid #f8f9fa' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af' }}>#{inv.invoice_number}</span>
                          <span style={{ fontFamily: 'Tajawal', fontSize: 11, color: '#9ca3af', marginRight: 8 }}>
                            {new Date(inv.created_at).toLocaleDateString('ar-KW')}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: '#1a4d6e' }}>
                          {formatPrice(inv.total)} BHD
                        </span>
                      </div>
                      <ActionButtons inv={inv} processing={processing}
                        onPay={(method) => setConfirmModal({ inv, method })}
                        onCancel={() => setConfirmModal({ inv, method: 'cancel' })}
                        onResend={() => handleResend(inv)}
                      />
                    </div>
                  ))}
                </div>
              );
            })
          )}
          <div className="h-2" />
        </div>
      )}

      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.method === 'cancel'
            ? 'إلغاء الفاتورة | Cancel Invoice'
            : confirmModal?.method === 'cash'
            ? 'الدفع كاش | Pay Cash'
            : 'الدفع ببنفت | Pay Benefit'
        }
      >
        {confirmModal && (
          <div className="p-5 space-y-4">
            <div className="rounded-2xl p-4 text-center" style={{ background: '#f8f9fa' }}>
              <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, color: '#212529', margin: 0 }}>
                {confirmModal.inv.customer_name}
              </p>
              <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>
                #{confirmModal.inv.invoice_number}
              </p>
              <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, color: '#1a4d6e', margin: '8px 0 0' }}>
                {formatPrice(confirmModal.inv.total)} BHD
              </p>
            </div>
            {confirmModal.method === 'cancel' ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmModal(null)}
                  style={{ flex: 1, padding: 12, border: '1.5px solid #dee2e6', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, background: 'white', cursor: 'pointer', color: '#6c757d' }}>
                  تراجع | Back
                </button>
                <button onClick={() => handleCancel(confirmModal.inv)} disabled={!!processing}
                  style={{ flex: 1, padding: 12, border: 'none', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, background: '#dc2626', cursor: 'pointer', color: 'white' }}>
                  إلغاء | Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setConfirmModal(null)}
                  style={{ flex: 1, padding: 12, border: '1.5px solid #dee2e6', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, background: 'white', cursor: 'pointer', color: '#6c757d' }}>
                  تراجع
                </button>
                <button
                  onClick={() => handlePay(confirmModal.inv, confirmModal.method as 'cash' | 'benefit')}
                  disabled={!!processing}
                  style={{
                    flex: 2, padding: 12, border: 'none', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14,
                    background: confirmModal.method === 'cash' ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                    cursor: processing ? 'not-allowed' : 'pointer', color: 'white',
                  }}>
                  {processing ? 'جارٍ المعالجة...' : confirmModal.method === 'cash' ? 'تأكيد كاش | Cash' : 'تأكيد بنفت | Benefit'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function PhoneHistoryReport({
  report, loading, onClose,
}: {
  report: PhoneReport | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl p-4 flex items-center justify-center gap-3"
        style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <RefreshCw size={16} color="#1a4d6e" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: 'Tajawal', fontSize: 14, color: '#1a4d6e' }}>جارٍ البحث في السجل...</span>
      </div>
    );
  }

  if (!report) return null;

  const total = report.totalPaid + report.totalUnpaid;
  const hasData = report.paid.length + report.unpaid.length > 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e9ecef', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: '#1a4d6e' }}>
        <div>
          <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, color: 'white', margin: 0 }}>
            {report.name || 'غير معروف'} | سجل الحساب
          </p>
          <p style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, direction: 'ltr' }}>
            {report.phone} · Account History
          </p>
        </div>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
          <X size={14} color="white" />
        </button>
      </div>

      {!hasData ? (
        <div className="px-4 py-5 text-center" style={{ fontFamily: 'Tajawal', color: '#9ca3af', fontSize: 13 }}>
          لا يوجد سجل لهذا الرقم | No records found
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2 text-center" style={{ background: '#dcfce7' }}>
              <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#16a34a', margin: 0 }}>
                {formatPrice(report.totalPaid)}
              </p>
              <p style={{ fontFamily: 'Tajawal', fontSize: 10, color: '#16a34a', margin: 0 }}>مدفوع | Paid</p>
              <p style={{ fontFamily: 'Inter', fontSize: 9, color: '#16a34a', margin: 0 }}>{report.paid.length} فاتورة</p>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: '#fee2e2' }}>
              <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#dc2626', margin: 0 }}>
                {formatPrice(report.totalUnpaid)}
              </p>
              <p style={{ fontFamily: 'Tajawal', fontSize: 10, color: '#dc2626', margin: 0 }}>معلق | Unpaid</p>
              <p style={{ fontFamily: 'Inter', fontSize: 9, color: '#dc2626', margin: 0 }}>{report.unpaid.length} فاتورة</p>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: '#fef3c7' }}>
              <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#c9a227', margin: 0 }}>
                {formatPrice(total)}
              </p>
              <p style={{ fontFamily: 'Tajawal', fontSize: 10, color: '#c9a227', margin: 0 }}>الإجمالي | Total</p>
              <p style={{ fontFamily: 'Inter', fontSize: 9, color: '#c9a227', margin: 0 }}>{report.paid.length + report.unpaid.length} فاتورة</p>
            </div>
          </div>

          {report.unpaid.length > 0 && (
            <div>
              <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 12, color: '#dc2626', margin: '0 0 6px' }}>
                الفواتير المعلقة | Pending Invoices
              </p>
              <div className="space-y-1">
                {report.unpaid.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center px-3 py-2 rounded-xl"
                    style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
                    <div>
                      <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af' }}>#{inv.invoice_number}</span>
                      <span style={{ fontFamily: 'Tajawal', fontSize: 10, color: '#9ca3af', marginRight: 6 }}>
                        {new Date(inv.created_at).toLocaleDateString('ar-KW')}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color: '#dc2626' }}>
                      {formatPrice(inv.total)} BHD
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  inv: Invoice;
  processing: string | null;
  onPay: (method: 'cash' | 'benefit') => void;
  onCancel: () => void;
  onResend: () => void;
}

function InvoiceCard({ inv, processing, onPay, onCancel, onResend }: CardProps) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#212529', margin: 0 }}>
              {inv.customer_name || 'عميل | Customer'}
            </p>
            {inv.customer_phone && (
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: '2px 0 0', direction: 'ltr' }}>
                {inv.customer_phone}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af' }}>#{inv.invoice_number}</span>
              {inv.is_fast_service && <span style={{ fontSize: 11, color: '#d97706' }}>⚡ مستعجل</span>}
            </div>
          </div>
          <div className="text-left">
            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, color: '#dc2626' }}>
              {formatPrice(inv.total)} BHD
            </span>
            <p style={{ fontFamily: 'Tajawal', fontSize: 11, color: '#9ca3af', margin: 0 }}>
              {new Date(inv.created_at).toLocaleDateString('ar-KW')}
            </p>
          </div>
        </div>
        <ActionButtons inv={inv} processing={processing} onPay={onPay} onCancel={onCancel} onResend={onResend} />
      </div>
    </div>
  );
}

function ActionButtons({ inv, processing, onPay, onCancel, onResend }: CardProps) {
  const isProcessing = processing === inv.id;
  return (
    <div className="flex gap-2 mt-2">
      <button onClick={() => onPay('benefit')} disabled={isProcessing}
        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-white text-xs font-bold"
        style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal' }}>
        <CheckCircle size={13} />
        بنفت | Benefit
      </button>
      <button onClick={() => onPay('cash')} disabled={isProcessing}
        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-white text-xs font-bold"
        style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal' }}>
        <CheckCircle size={13} />
        كاش | Cash
      </button>
      <button onClick={onResend}
        className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', cursor: 'pointer', fontFamily: 'Tajawal', flexShrink: 0 }}>
        <MessageCircle size={13} />
      </button>
      <button onClick={onCancel} disabled={isProcessing}
        className="px-3 py-2 rounded-xl text-xs font-bold"
        style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}>
        <XCircle size={13} />
      </button>
    </div>
  );
}
