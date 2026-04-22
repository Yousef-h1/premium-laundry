import { useState, useEffect, useCallback } from 'react';
import { BottomNav } from './components/BottomNav';
import { PinPad } from './components/PinPad';
import { DashboardPage } from './pages/DashboardPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { UnpaidPage } from './pages/UnpaidPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
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
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unpaid');
    setUnpaidCount(count || 0);
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
        setSyncBanner(`تمت مزامنة ${result.synced} فاتورة | ${result.synced} invoices synced`);
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
      setReportsLocked(true);
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
      case 'dashboard':
        return <DashboardPage key={refreshKey} />;
      case 'new-order':
        return <NewOrderPage onOrderSaved={handleOrderSaved} />;
      case 'unpaid':
        return <UnpaidPage key={refreshKey} />;
      case 'expenses':
        return <ExpensesPage key={refreshKey} />;
      case 'reports':
        return <ReportsPage key={refreshKey} />;
      default:
        return <DashboardPage />;
    }
  };

  if (appLocked) {
    return (
      <PinPad
        title="App Lock"
        titleAr="قفل التطبيق"
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
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        background: '#f1f3f5',
        overflow: 'hidden',
      }}
    >
      <PinPad
        title="Reports Lock"
        titleAr="قفل التقارير"
        onSuccess={handleReportsUnlock}
        correctPin="1988"
        isOpen={requestedPage === 'reports' && reportsLocked}
      />

      <AppHeader pendingSync={pendingSync} syncing={syncing} />

      {syncBanner && (
        <div
          style={{
            position: 'fixed', top: 60, left: 8, right: 8, zIndex: 300,
            background: '#16a34a', color: 'white', borderRadius: 14,
            padding: '10px 16px', fontFamily: 'Tajawal', fontWeight: 700,
            fontSize: 13, textAlign: 'center', boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {syncBanner}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', paddingBottom: 65 }}>
        {renderPage()}
      </div>
      <BottomNav current={page} onChange={handlePageChange} unpaidCount={unpaidCount} />
    </div>
  );
}

function AppHeader({ pendingSync, syncing }: { pendingSync: number; syncing: boolean }) {
  const today = new Date().toLocaleDateString('ar-KW', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a4d6e 0%, #0f3450 100%)',
        padding: '12px 20px 10px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 17, color: 'white', margin: 0, lineHeight: 1.2 }}>
            مغسلة الخدمة المميزة
          </h1>
          <p style={{ fontFamily: 'Inter', fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, letterSpacing: 0.5 }}>
            Premium Service Laundry
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(pendingSync > 0 || syncing) && (
            <div
              style={{
                background: syncing ? 'rgba(201,162,39,0.9)' : 'rgba(220,38,38,0.85)',
                borderRadius: 10, padding: '4px 8px',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />
              <span style={{ fontFamily: 'Tajawal', fontSize: 10, color: 'white', fontWeight: 700 }}>
                {syncing ? 'مزامنة...' : `${pendingSync} غير متزامن`}
              </span>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '5px 10px' }}>
            <p style={{ fontFamily: 'Tajawal', fontSize: 12, color: 'rgba(255,255,255,0.9)', margin: 0, fontWeight: 600 }}>
              {today}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
