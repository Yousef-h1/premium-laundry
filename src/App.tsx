import { useState, useEffect, useCallback } from 'react';
// تصحيح المسارات: في GitHub المجلدات تبدأ بأحرف صغيرة src/components و src/pages
import { BottomNav } from './components/BottomNav';
import { PinPad } from './components/PinPad';

// تصحيح الاستدعاءات لتطابق أسماء الملفات في GitHub حرفياً (PascalCase للملفات)
import { DashboardPage } from './pages/DashboardPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { UnpaidPage } from './pages/UnpaidPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';

// استيراد الإعدادات من مجلد lib
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

  useEffect(() => {
    setAppLocked(isAppLocked());
    setReportsLocked(isReportsLocked());
  }, []);

  const loadUnpaidCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unpaid');
      setUnpaidCount(count || 0);
    } catch (error) {
      console.error("Supabase Error:", error);
    }
  }, []);

  useEffect(() => {
    loadUnpaidCount();
  }, [loadUnpaidCount, refreshKey]);

  useEffect(() => {
    getPendingCount().then(setPendingSync);

    const cleanup = setupOnlineListener(async (result) => {
      setSyncing(false);
      setPendingSync(0);
      if (result.synced > 0) {
        setSyncBanner(`تمت مزامنة ${result.synced} فاتورة بنجاح`);
        setTimeout(() => setSyncBanner(null), 4000);
        setRefreshKey((k) => k + 1);
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

  const handleOrderSaved = () => {
    setRefreshKey((k) => k + 1);
    loadUnpaidCount();
    getPendingCount().then(setPendingSync);
  };

  const handlePageChange = (newPage: Page) => {
    if (newPage === 'reports' && isReportsLocked()) {
      setRequestedPage('reports');
    } else {
      setPage(newPage);
      setRequestedPage(null);
    }
  };

  const handleAppUnlock = () => {
    unlockApp();
    setAppLocked(false);
  };

  const handleReportsUnlock = () => {
    unlockReports();
    setReportsLocked(false);
    setPage('reports');
    setRequestedPage(null);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage key={refreshKey} />;
      case 'new-order': return <NewOrderPage onOrderSaved={handleOrderSaved} />;
      case 'unpaid': return <UnpaidPage key={refreshKey} />;
      case 'expenses': return <ExpensesPage key={refreshKey} />;
      case 'reports': return <ReportsPage key={refreshKey} />;
      default: return <DashboardPage />;
    }
  };

  if (appLocked) {
    return (
      <PinPad
        title="دخول النظام"
        titleAr="مغسلة الخدمة المميزة"
        onSuccess={handleAppUnlock}
        correctPin="0005"
        isOpen={appLocked}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxWidth: 500,
        margin: '0 auto',
        position: 'relative',
        background: '#1a222a', // اللون الداكن الاحترافي POS
        overflow: 'hidden',
        touchAction: 'manipulation'
      }}
    >
      <PinPad
        title="قفل التقارير"
        titleAr="القسم المحاسبي"
        onSuccess={handleReportsUnlock}
        correctPin="1988"
        isOpen={requestedPage === 'reports' && reportsLocked}
      />

      <AppHeader pendingSync={pendingSync} syncing={syncing} />

      {syncBanner && (
        <div style={bannerStyle}>{syncBanner}</div>
      )}

      <main style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
        {renderPage()}
      </main>

      <BottomNav current={page} onChange={handlePageChange} unpaidCount={unpaidCount} />

      <style>{`
        body { overscroll-behavior-y: none; margin: 0; padding: 0; background: #1a222a; font-family: 'Tajawal', sans-serif; }
        main::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; outline: none; }
      `}</style>
    </div>
  );
}

function AppHeader({ pendingSync, syncing }: { pendingSync: number; syncing: boolean }) {
  const today = new Date().toLocaleDateString('ar-BH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div style={{
      background: '#1a222a',
      padding: '12px 20px',
      paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
      flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 18, color: 'white', margin: 0 }}>
            الخدمة المميزة
          </h1>
          <p style={{ fontFamily: 'Inter', fontSize: 9, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase' }}>
            Laundry System Pro
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {(pendingSync > 0 || syncing) && (
            <div style={{
              background: syncing ? '#f59e0b' : '#ef4444',
              borderRadius: 8, padding: '4px 8px',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <span className={syncing ? "animate-pulse" : ""} style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
              <span style={{ fontFamily: 'Tajawal', fontSize: 10, color: 'white', fontWeight: 700 }}>
                {syncing ? 'مزامنة...' : `${pendingSync} معلق`}
              </span>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ fontFamily: 'Tajawal', fontSize: 12, color: '#fff', margin: 0, fontWeight: 600 }}>
              {today}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: 'absolute', top: 80, left: 20, right: 20, zIndex: 1000,
  background: '#10b981', color: 'white', borderRadius: 12,
  padding: '12px', fontFamily: 'Tajawal', fontWeight: 700,
  fontSize: 13, textAlign: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
};
