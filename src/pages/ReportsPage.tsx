import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, TrendingDown, DollarSign, RefreshCw, Calendar, ChevronDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Invoice } from '../lib/types';
import { formatPrice } from '../lib/utils';

type CompareMode = 'monthly' | 'yearly';
type QuickRange = 'current_month' | 'last_3_months' | 'current_year';

interface ChartDataPoint {
  label: string;
  labelAr: string;
  sales: number;
  expenses: number;
  profit: number;
}

interface Summary {
  sales: number;
  expenses: number;
  profit: number;
  count: number;
}

interface Expense {
  id: string;
  total_amount: number;
  created_at: string;
}

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function getDefaultDates(range: QuickRange) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (range === 'current_month') {
    const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from, to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}` };
  }
  if (range === 'last_3_months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 2);
    d.setDate(1);
    const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from, to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}` };
  }
  return {
    from: `${now.getFullYear()}-01-01`,
    to: `${now.getFullYear()}-12-31`,
  };
}

export function ReportsPage() {
  const [fromDate, setFromDate] = useState(() => getDefaultDates('current_month').from);
  const [toDate, setToDate] = useState(() => getDefaultDates('current_month').to);
  const [compareMode, setCompareMode] = useState<CompareMode>('monthly');
  const [quickRange, setQuickRange] = useState<QuickRange>('current_month');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const applyQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    const { from, to } = getDefaultDates(range);
    setFromDate(from);
    setToDate(to);
  };

  const fetchData = async () => {
    setLoading(true);
    const [invRes, expRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`)
        .neq('status', 'cancelled')
        .order('created_at'),
      supabase
        .from('expenses')
        .select('id, total_amount, created_at')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`)
        .order('created_at'),
    ]);
    if (invRes.data) setInvoices(invRes.data as Invoice[]);
    if (expRes.data) setExpensesList(expRes.data as Expense[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totalExpensesAmount = expensesList.reduce((s, e) => s + e.total_amount, 0);
  const summary: Summary = invoices.reduce<Summary>(
    (acc, inv) => {
      if (inv.status !== 'unpaid') {
        acc.sales += inv.total;
      }
      acc.count++;
      return acc;
    },
    { sales: 0, expenses: totalExpensesAmount, profit: 0, count: 0 }
  );
  summary.profit = Math.max(0, summary.sales - summary.expenses);

  const buildChartData = (): ChartDataPoint[] => {
    const map: Record<string, ChartDataPoint> = {};

    const getKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (compareMode === 'monthly') {
        return {
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: `${d.toLocaleDateString('en', { month: 'short' })} ${d.getFullYear()}`,
          labelAr: AR_MONTHS[d.getMonth()],
        };
      }
      const year = String(d.getFullYear());
      return { key: year, label: year, labelAr: year };
    };

    invoices.forEach((inv) => {
      const { key, label, labelAr } = getKey(inv.created_at);
      if (!map[key]) map[key] = { label, labelAr, sales: 0, expenses: 0, profit: 0 };
      if (inv.status !== 'unpaid') map[key].sales += inv.total;
    });

    expensesList.forEach((exp) => {
      const { key, label, labelAr } = getKey(exp.created_at);
      if (!map[key]) map[key] = { label, labelAr, sales: 0, expenses: 0, profit: 0 };
      map[key].expenses += exp.total_amount;
    });

    Object.values(map).forEach((d) => {
      d.profit = Math.max(0, d.sales - d.expenses);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  };

  const chartData = buildChartData();

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'white', border: '1px solid #e9ecef', borderRadius: 12,
        padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        fontFamily: 'Inter', fontSize: 12,
      }}>
        <p style={{ fontFamily: 'Tajawal', fontWeight: 700, color: '#1a4d6e', margin: '0 0 6px' }}>{label}</p>
        {payload.map((entry, i) => (
          <div key={i} style={{ color: entry.color, marginBottom: 2 }}>
            <span style={{ fontWeight: 600 }}>{entry.name}: </span>
            <span>{formatPrice(entry.value)} BHD</span>
          </div>
        ))}
      </div>
    );
  };

  const QUICK_OPTIONS: { key: QuickRange; ar: string; en: string }[] = [
    { key: 'current_month', ar: 'هذا الشهر', en: 'This Month' },
    { key: 'last_3_months', ar: 'آخر 3 أشهر', en: 'Last 3 Months' },
    { key: 'current_year', ar: 'هذا العام', en: 'This Year' },
  ];

  const MODE_OPTIONS: { key: CompareMode; ar: string; en: string }[] = [
    { key: 'monthly', ar: 'شهري', en: 'Monthly' },
    { key: 'yearly', ar: 'سنوي', en: 'Yearly' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#f1f3f5' }}>
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3"
        style={{ background: 'white', borderBottom: '1px solid #e9ecef' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 20, color: '#1a4d6e', margin: 0 }}>
              التقارير
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#9ca3af', margin: 0 }}>Financial Reports</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{ background: '#f1f3f5', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} color="#6c757d" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        <div className="flex gap-1.5">
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => applyQuickRange(opt.key)}
              style={{
                flex: 1, padding: '7px 4px', border: 'none', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'Tajawal', fontWeight: 700, fontSize: 11,
                background: quickRange === opt.key ? '#1a4d6e' : '#f1f3f5',
                color: quickRange === opt.key ? 'white' : '#6c757d',
                transition: 'all 0.15s',
              }}
            >
              {opt.ar}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Calendar size={13} style={{ position: 'absolute', top: 12, right: 10, color: '#9ca3af', zIndex: 1 }} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 30px 10px 10px', border: '1.5px solid #e9ecef',
                borderRadius: 10, fontFamily: 'Inter', fontSize: 13, background: '#f8f9fa',
                outline: 'none', color: '#212529', direction: 'ltr',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div className="relative">
            <Calendar size={13} style={{ position: 'absolute', top: 12, right: 10, color: '#9ca3af', zIndex: 1 }} />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 30px 10px 10px', border: '1.5px solid #e9ecef',
                borderRadius: 10, fontFamily: 'Inter', fontSize: 13, background: '#f8f9fa',
                outline: 'none', color: '#212529', direction: 'ltr',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            width: '100%', padding: '11px', border: 'none', borderRadius: 12,
            fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            background: loading ? '#9ca3af' : 'linear-gradient(135deg,#1a4d6e,#2a6d9e)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> جارٍ التحميل...</>
          ) : (
            <><BarChart2 size={16} /> بحث | Generate Report</>
          )}
        </button>
      </div>

      <div className="flex-1 scrollable p-4 space-y-4">
        <div className="w-full space-y-2">
          <SummaryCard
            labelAr="إجمالي المبيعات"
            labelEn="Total Sales"
            value={formatPrice(summary.sales)}
            icon={<TrendingUp size={18} />}
            color="#16a34a"
            bg="#dcfce7"
          />
          <SummaryCard
            labelAr="إجمالي المصروفات"
            labelEn="Total Expenses"
            value={formatPrice(summary.expenses)}
            icon={<TrendingDown size={18} />}
            color="#dc2626"
            bg="#fee2e2"
          />
          <SummaryCard
            labelAr="صافي الأرباح"
            labelEn="Net Profit"
            value={formatPrice(summary.profit)}
            icon={<DollarSign size={18} />}
            color="#c9a227"
            bg="#fef3c7"
          />
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#1a4d6e', margin: 0 }}>
                مقارنة الأداء | Performance
              </h2>
              <p style={{ fontFamily: 'Inter', fontSize: 11, color: '#9ca3af', margin: 0 }}>Sales vs Uncollected</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowModeDropdown((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                  border: '1.5px solid #e9ecef', borderRadius: 10, background: '#f8f9fa',
                  cursor: 'pointer', fontFamily: 'Tajawal', fontSize: 12, color: '#1a4d6e',
                  fontWeight: 600,
                }}
              >
                {MODE_OPTIONS.find((m) => m.key === compareMode)?.ar}
                <ChevronDown size={13} />
              </button>
              {showModeDropdown && (
                <div
                  style={{
                    position: 'absolute', top: '110%', left: 0, background: 'white',
                    border: '1px solid #e9ecef', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    zIndex: 50, minWidth: 100, overflow: 'hidden',
                  }}
                >
                  {MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setCompareMode(opt.key); setShowModeDropdown(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '9px 14px', border: 'none',
                        background: compareMode === opt.key ? '#eff6ff' : 'transparent',
                        color: compareMode === opt.key ? '#1a4d6e' : '#212529',
                        fontFamily: 'Tajawal', fontWeight: compareMode === opt.key ? 700 : 400,
                        fontSize: 13, cursor: 'pointer', textAlign: 'right',
                      }}
                    >
                      {opt.ar} | {opt.en}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} color="#9ca3af" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-10" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>
              لا توجد بيانات في هذه الفترة | No data in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" vertical={false} />
                <XAxis
                  dataKey="labelAr"
                  tick={{ fontFamily: 'Tajawal', fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontFamily: 'Inter', fontSize: 9, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v.toFixed(0)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontFamily: 'Tajawal', fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => value === 'sales' ? 'مبيعات' : value === 'expenses' ? 'غير محصل' : 'أرباح'}
                />
                <Bar dataKey="sales" name="sales" fill="#1a4d6e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="profit" fill="#c9a227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f3f5' }}>
            <h2 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color: '#1a4d6e', margin: 0 }}>
              تفاصيل الفترة | Period Details
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-8" style={{ color: '#9ca3af', fontFamily: 'Tajawal' }}>جارٍ التحميل...</div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <SummaryRow labelAr="عدد الفواتير" labelEn="Invoice Count" value={`${summary.count}`} />
              <SummaryRow labelAr="إجمالي المبيعات" labelEn="Total Sales" value={`${formatPrice(summary.sales)} BHD`} color="#16a34a" />
              <SummaryRow labelAr="إجمالي المصروفات" labelEn="Total Expenses" value={`${formatPrice(summary.expenses)} BHD`} color="#dc2626" />
              <div style={{ height: 1, background: '#f1f3f5', margin: '8px 0' }} />
              <SummaryRow labelAr="صافي الأرباح" labelEn="Net Profit" value={`${formatPrice(summary.profit)} BHD`} color="#c9a227" bold />
            </div>
          )}
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}

function SummaryCard({ labelAr, labelEn, value, icon, color, bg }: {
  labelAr: string; labelEn: string; value: string;
  icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div
        className="mx-auto mb-2 rounded-xl flex items-center justify-center"
        style={{ width: 36, height: 36, background: bg, color }}
      >
        {icon}
      </div>
      <p style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color, margin: 0 }}>{value}</p>
      <p style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 10, color: '#212529', margin: '2px 0 0', lineHeight: 1.2 }}>
        {labelAr}
      </p>
      <p style={{ fontFamily: 'Inter', fontSize: 9, color: '#9ca3af', margin: 0 }}>{labelEn}</p>
    </div>
  );
}

function SummaryRow({ labelAr, labelEn, value, color, bold }: {
  labelAr: string; labelEn: string; value: string; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span style={{ fontFamily: 'Tajawal', fontWeight: bold ? 700 : 500, fontSize: 13, color: '#212529' }}>{labelAr}</span>
        <span style={{ fontFamily: 'Inter', fontSize: 10, color: '#9ca3af', marginRight: 6 }}>| {labelEn}</span>
      </div>
      <span style={{ fontFamily: 'Inter', fontWeight: bold ? 700 : 600, fontSize: 13, color: color || '#1a4d6e' }}>
        {value}
      </span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const nameMap: Record<string, string> = { sales: 'مبيعات', expenses: 'غير محصل', profit: 'أرباح' };
  return (
    <div style={{
      background: 'white', border: '1px solid #e9ecef', borderRadius: 12,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontFamily: 'Tajawal', fontWeight: 700, color: '#1a4d6e', margin: '0 0 6px', fontSize: 13 }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color, fontFamily: 'Inter', fontSize: 12, marginBottom: 2 }}>
          <span style={{ fontWeight: 600 }}>{nameMap[entry.name] || entry.name}: </span>
          <span>{formatPrice(entry.value)} BHD</span>
        </div>
      ))}
    </div>
  );
}
