import { supabase } from './supabase';

const DB_NAME = 'laundry_offline';
const DB_VERSION = 1;
const STORE_INVOICES = 'pending_invoices';

interface PendingInvoice {
  id: string;
  invoice: Record<string, unknown>;
  items: Record<string, unknown>[];
  createdAt: number;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_INVOICES)) {
        const store = db.createObjectStore(STORE_INVOICES, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineInvoice(
  invoice: Record<string, unknown>,
  items: Record<string, unknown>[]
): Promise<string> {
  const db = await openDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: PendingInvoice = { id, invoice, items, createdAt: Date.now(), synced: false };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INVOICES, 'readwrite');
    tx.objectStore(STORE_INVOICES).add(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_INVOICES, 'readonly');
    const index = tx.objectStore(STORE_INVOICES).index('synced');
    const req = index.count(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}

async function getPendingInvoices(): Promise<PendingInvoice[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_INVOICES, 'readonly');
    const index = tx.objectStore(STORE_INVOICES).index('synced');
    const req = index.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

async function markSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INVOICES, 'readwrite');
    const store = tx.objectStore(STORE_INVOICES);
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result as PendingInvoice;
      if (record) {
        record.synced = true;
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncOfflineInvoices(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingInvoices();
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert(record.invoice)
        .select()
        .single();

      if (invErr || !inv) { failed++; continue; }

      const itemsWithId = record.items.map((item) => ({ ...item, invoice_id: inv.id }));
      const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsWithId);

      if (itemsErr) { failed++; continue; }

      await markSynced(record.id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export function setupOnlineListener(onSync: (result: { synced: number; failed: number }) => void) {
  const handler = async () => {
    if (navigator.onLine) {
      const count = await getPendingCount();
      if (count > 0) {
        const result = await syncOfflineInvoices();
        onSync(result);
      }
    }
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
