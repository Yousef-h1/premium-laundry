const APP_LOCK_SESSION_KEY = 'app_lock_session';
const REPORTS_LOCK_SESSION_KEY = 'reports_lock_session';

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export function isAppLocked(): boolean {
  const sessionData = sessionStorage.getItem(APP_LOCK_SESSION_KEY);
  if (!sessionData) return true;

  try {
    const { timestamp } = JSON.parse(sessionData);
    const now = Date.now();

    if (now - timestamp > SESSION_DURATION) {
      sessionStorage.removeItem(APP_LOCK_SESSION_KEY);
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function unlockApp(): void {
  sessionStorage.setItem(
    APP_LOCK_SESSION_KEY,
    JSON.stringify({ timestamp: Date.now() })
  );
}

export function lockApp(): void {
  sessionStorage.removeItem(APP_LOCK_SESSION_KEY);
  sessionStorage.removeItem(REPORTS_LOCK_SESSION_KEY);
}

export function isReportsLocked(): boolean {
  const sessionData = sessionStorage.getItem(REPORTS_LOCK_SESSION_KEY);
  if (!sessionData) return true;

  try {
    const { timestamp } = JSON.parse(sessionData);
    const now = Date.now();

    if (now - timestamp > SESSION_DURATION) {
      sessionStorage.removeItem(REPORTS_LOCK_SESSION_KEY);
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function unlockReports(): void {
  sessionStorage.setItem(
    REPORTS_LOCK_SESSION_KEY,
    JSON.stringify({ timestamp: Date.now() })
  );
}
