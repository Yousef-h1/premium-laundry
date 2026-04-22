import { LayoutDashboard, PlusCircle, AlertCircle, BarChart2, Receipt } from 'lucide-react';
import { Page } from '../lib/types';

interface Props {
  current: Page;
  onChange: (page: Page) => void;
  unpaidCount: number;
}

const items: { page: Page; labelAr: string; Icon: React.FC<{ size?: number; style?: React.CSSProperties }> }[] = [
  { page: 'dashboard', labelAr: 'الرئيسية', Icon: LayoutDashboard },
  { page: 'new-order', labelAr: 'طلب جديد', Icon: PlusCircle },
  { page: 'unpaid', labelAr: 'غير مدفوع', Icon: AlertCircle },
  { page: 'expenses', labelAr: 'المصروفات', Icon: Receipt },
  { page: 'reports', labelAr: 'التقارير', Icon: BarChart2 },
];

export function BottomNav({ current, onChange, unpaidCount }: Props) {
  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 50,
        background: 'white', borderTop: '1px solid #e9ecef',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch">
        {items.map(({ page, labelAr, Icon }) => {
          const active = current === page;
          const isNew = page === 'new-order';
          const isUnpaid = page === 'unpaid';

          if (isNew) {
            return (
              <button
                key={page}
                onClick={() => onChange(page)}
                className="flex-1 flex flex-col items-center justify-center py-2 relative"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{
                    width: 50, height: 50,
                    background: active
                      ? 'linear-gradient(135deg, #1a4d6e, #2a6d9e)'
                      : 'linear-gradient(135deg, #c9a227, #a8841e)',
                    boxShadow: '0 4px 14px rgba(26,77,110,0.3)',
                    marginTop: -18,
                  }}
                >
                  <Icon size={22} style={{ color: 'white' }} />
                </div>
                <span style={{ fontFamily: 'Tajawal', fontWeight: 600, color: active ? '#1a4d6e' : '#c9a227', fontSize: 10, marginTop: 2 }}>
                  {labelAr}
                </span>
              </button>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onChange(page)}
              className="flex-1 flex flex-col items-center justify-center py-2 relative"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <div className="relative">
                <Icon size={21} style={{ color: active ? '#1a4d6e' : '#9ca3af' }} />
                {isUnpaid && unpaidCount > 0 && (
                  <span
                    className="absolute -top-1 -right-2 flex items-center justify-center rounded-full text-white"
                    style={{ width: 16, height: 16, background: '#dc2626', fontSize: 9, fontWeight: 700 }}
                  >
                    {unpaidCount > 9 ? '9+' : unpaidCount}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: 'Tajawal',
                  fontWeight: active ? 700 : 400,
                  color: active ? '#1a4d6e' : '#9ca3af',
                  fontSize: 10, marginTop: 2,
                }}
              >
                {labelAr}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
