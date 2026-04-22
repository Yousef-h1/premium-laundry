import { useState, useEffect } from 'react';
import { Search, Plus, Phone, CreditCard, Trash2, RefreshCw, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Customer } from '../lib/types';
import { Modal } from '../components/Modal';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', is_credit: false, notes: '' });
  const [saving, setSaving] = useState(false);
  const [customerStats, setCustomerStats] = useState<Record<string, { count: number; total: number }>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (data) setCustomers(data as Customer[]);

    const { data: invData } = await supabase
      .from('invoices')
      .select('customer_phone, total, status')
      .neq('status', 'cancelled');

    if (invData) {
      const stats: Record<string, { count: number; total: number }> = {};
      invData.forEach((inv) => {
        const key = inv.customer_phone;
        if (!key) return;
        if (!stats[key]) stats[key] = { count: 0, total: 0 };
        stats[key].count++;
        stats[key].total += inv.total;
      });
      setCustomerStats(stats);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from('customers').insert({
      name: form.name,
      phone: form.phone,
      is_credit: form.is_credit,
      notes: form.notes,
    });
    setSaving(false);
    setShowAddModal(false);
    setForm({ name: '', phone: '', is_credit: false, notes: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف العميل؟ | Delete customer?')) return;
    await supabase.from('customers').delete().eq('id', id);
    load();
  };

  const toggleCredit = async (customer: Customer) => {
    await supabase.from('customers').update({ is_credit: !customer.is_credit }).eq('id', customer.id);
    load();
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
              العملاء
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: 0 }}>Customers ({customers.length})</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              style={{ background: '#f1f3f5', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
            >
              <RefreshCw size={16} color="#6c757d" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-bold"
              style={{ background: 'linear-gradient(135deg,#1a4d6e,#2a6d9e)', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 13 }}
            >
              <Plus size={16} />
              إضافة | Add
            </button>
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute" style={{ top: 12, right: 12, color: '#9ca3af' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث | Search customers"
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
          <div className="py-12 text-center space-y-3">
            <User size={48} color="#dee2e6" className="mx-auto" />
            <p style={{ fontFamily: 'Tajawal', fontSize: 15, color: '#9ca3af' }}>لا يوجد عملاء | No customers</p>
          </div>
        ) : (
          filtered.map((customer) => {
            const stats = customerStats[customer.phone] || { count: 0, total: 0 };
            return (
              <div
                key={customer.id}
                className="rounded-2xl p-4"
                style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#212529' }}>
                        {customer.name}
                      </span>
                      {customer.is_credit && (
                        <span
                          style={{
                            background: '#dbeafe', color: '#2563eb', fontFamily: 'Tajawal',
                            fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 20,
                          }}
                        >
                          آجل | Credit
                        </span>
                      )}
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Phone size={12} color="#9ca3af" />
                        <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#6c757d', direction: 'ltr' }}>
                          {customer.phone}
                        </span>
                      </div>
                    )}
                    {customer.notes && (
                      <p style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
                        {customer.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => toggleCredit(customer)}
                        style={{
                          background: customer.is_credit ? '#dbeafe' : '#f1f3f5',
                          border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
                        }}
                        title="Toggle Credit"
                      >
                        <CreditCard size={14} color={customer.is_credit ? '#2563eb' : '#9ca3af'} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                </div>

                {(stats.count > 0) && (
                  <div
                    className="mt-3 flex items-center justify-between rounded-xl p-2"
                    style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                  >
                    <span style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#6c757d' }}>
                      {stats.count} طلب | orders
                    </span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: '#1a4d6e' }}>
                      {stats.total.toFixed(3)} BHD إجمالي
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div className="h-2" />
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة عميل | Add Customer">
        <div className="p-5 space-y-4">
          <div>
            <label style={{ fontFamily: 'Tajawal', fontSize: 13, color: '#343a40', display: 'block', marginBottom: 6 }}>
              الاسم * | Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="اسم العميل"
              style={{
                width: '100%', padding: '12px 14px', border: '1.5px solid #e9ecef',
                borderRadius: 12, fontFamily: 'Tajawal', fontSize: 15, outline: 'none',
                color: '#212529', direction: 'rtl', background: '#f8f9fa',
              }}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'Tajawal', fontSize: 13, color: '#343a40', display: 'block', marginBottom: 6 }}>
              الهاتف | Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+965 XXXX XXXX"
              type="tel"
              style={{
                width: '100%', padding: '12px 14px', border: '1.5px solid #e9ecef',
                borderRadius: 12, fontFamily: 'Inter', fontSize: 15, outline: 'none',
                color: '#212529', direction: 'ltr', background: '#f8f9fa',
              }}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'Tajawal', fontSize: 13, color: '#343a40', display: 'block', marginBottom: 6 }}>
              ملاحظات | Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="أي ملاحظات..."
              rows={2}
              style={{
                width: '100%', padding: '12px 14px', border: '1.5px solid #e9ecef',
                borderRadius: 12, fontFamily: 'Tajawal', fontSize: 14, outline: 'none',
                color: '#212529', direction: 'rtl', background: '#f8f9fa', resize: 'none',
              }}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm((f) => ({ ...f, is_credit: !f.is_credit }))}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.is_credit ? '#1a4d6e' : '#dee2e6',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2,
                  right: form.is_credit ? 2 : 'auto',
                  left: form.is_credit ? 'auto' : 2,
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <span style={{ fontFamily: 'Tajawal', fontSize: 14, color: '#343a40' }}>
              دفع آجل | Credit Customer
            </span>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                flex: 1, padding: 12, border: '1.5px solid #dee2e6', borderRadius: 12,
                fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, background: 'white',
                cursor: 'pointer', color: '#6c757d',
              }}
            >
              إلغاء | Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !form.name.trim()}
              style={{
                flex: 2, padding: 12, border: 'none', borderRadius: 12,
                fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14,
                background: saving || !form.name.trim() ? '#9ca3af' : 'linear-gradient(135deg,#1a4d6e,#2a6d9e)',
                cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer', color: 'white',
              }}
            >
              {saving ? 'جارٍ الحفظ...' : 'إضافة | Add'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
