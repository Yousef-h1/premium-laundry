import { useState, useEffect, useCallback } from 'react';
// استيراد المكونات - مسارات مصححة بدقة
import { BottomNav } from './components/BottomNav';
import { PinPad } from './components/PinPad';

// استيراد الصفحات - تأكد من مطابقة حالة الأحرف في GitHub حرفياً
import { DashboardPage } from './pages/DashboardPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { UnpaidPage } from './pages/UnpaidPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';

// المكتبات الأساسية
import { Page } from './lib/types';
import { supabase } from './lib/supabase';
import { getPendingCount, setupOnlineListener } from './lib/offlineSync';
import { isAppLocked, unlockApp, isReportsLocked, unlockReports } from './lib/security';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const [appLocked, setAppLocked] = useState(true);
  const [reportsLocked, setReportsLocked] = useState(true);
  const [requestedPage, setRequestedPage] = useState<Page | null>(null);

  // إدارة قفل التطبيق عند الفتح
  useEffect(() => {
    setAppLocked(isAppLocked());
    setReportsLocked(isReportsLocked());
  }, []);

  // تحديث عدد الطلبات غير المدفوعة مع معالجة الأخطاء
  const loadUnpaidCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unpaid');
      
      if (error) throw error;
      setUnpaidCount(count || 0);
    } catch (err) {
      console.error("Supabase Sync Error:", err);
    }
  }, []);

  useEffect(() => {
    loadUnpaidCount();
  }, [loadUnpaidCount, refreshKey]);

  // مستمع المزامنة (Offline Sync)
  useEffect(() => {
    getPendingCount().then(setPendingSync);

    const cleanup = setupOnlineListener(async (result) => {
      setSyncing(false);
      setPendingSync(0);
      if (result.synced > 0) {
        setSyncBanner(`تمت مزامنة ${result.synced} فاتورة بنجاح`);
        setTimeout(() => setSyncBanner(null), 4000);
        setRefreshKey(k => k + 1);
        loadUnpaidCount();
      }
    });

    const handleOnline = () => setSyncing(true);
    window.addEventListener('online', handleOnline);

    return () => {
      cleanup();
      window.removeEventListener('online', handleOnline);
    };
  }, [loadUnpaidCount]);

  const handlePageChange = (newPage: Page) => {
    if (newPage === 'reports' && isReportsLocked()) {
      setRequestedPage('reports');
    } else {
      setPage(newPage);
      setRequestedPage(null);
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage key={refreshKey} />;
      case 'new-order': return <NewOrderPage onOrderSaved={() => setRefreshKey(k => k + 1)} />;
      case 'unpaid': return <UnpaidPage key={refreshKey} />;
      case 'expenses': return <ExpensesPage key={refreshKey} />;
      case 'reports': return <ReportsPage key={refreshKey} />;
      default: return <DashboardPage />;
    }
  };

  if (appLocked) {
    return (
      <PinPad
        title="App Lock"
        titleAr="نظام الخدمة المميزة"
        onSuccess={() => { unlockApp(); setAppLocked(false); }}
        correctPin="0005"
        isOpen={appLocked}
      />
    );
  }

  return (
    <div style={appContainerStyle}>
      <PinPad
        title="Reports Lock"
        titleAr="قفل المحاسبة"
        onSuccess={() => { unlockReports(); setReportsLocked(false); setPage('reports'); setRequestedPage(null); }}
        correctPin="1988"
        isOpen={requestedPage === 'reports' && reportsLocked}
      />

      <header style={headerStyle}>
        <div style={headerContentStyle}>
          <div>
            <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>الخدمة المميزة</h1>
            <p style={{ fontSize: '0.6rem', margin: 0, opacity: 0.5 }}>PREMIUM LAUNDRY POS</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {pendingSync > 0 && (
              <span style={syncBadgeStyle}>{pendingSync} معلق</span>
            )}
            <div style={dateBadgeStyle}>
              {new Date().toLocaleDateString('ar-BH', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      </header>

      {syncBanner && <div style={bannerStyle}>{syncBanner}</div>}

      <main style={mainContentStyle}>
        {renderPage()}
      </main>

      <BottomNav current={page} onChange={handlePageChange} unpaidCount={unpaidCount} />

      <style>{`
        body { background: #1a222a; margin: 0; font-family: 'Tajawal', sans-serif; overscroll-behavior-y: none; }
        * { -webkit-tap-highlight-color: transparent; }
        main::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// --- تنسيقات التصميم الداكن POS ---
const appContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
  maxWidth: '500px',
  margin: '0 auto',
  background: '#1a222a',
  color: 'white',
  overflow: 'hidden',
  position: 'relative'
};

const headerStyle: React.CSSProperties = {
  background: '#1a222a',
  padding: '15px 20px',
  paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  flexShrink: 0
};

const headerContentStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  paddingBottom: '20px',
  position: 'relative'
};

const syncBadgeStyle: React.CSSProperties = {
  background: '#ef4444',
  fontSize: '9px',
  padding: '4px 8px',
  borderRadius: '6px',
  fontWeight: 'bold'
};

const dateBadgeStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  padding: '5px 10px',
  borderRadius: '8px',
  fontSize: '11px'
};

const bannerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '80px',
  left: '20px',
  right: '20px',
  background: '#10b981',
  color: 'white',
  padding: '12px',
  borderRadius: '12px',
  textAlign: 'center',
  zIndex: 100,
  fontSize: '13px',
  fontWeight: 'bold',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
};
