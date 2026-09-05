/**
 * Security Rate Limiter & Account Lockout
 * Locks out login after 5 consecutive failed attempts for 15 minutes.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

interface AttemptRecord {
  count: number;
  lockoutUntil?: number;
  lastAttemptTime: number;
}

const STORAGE_KEY_PREFIX = "km_auth_lockout_";

function getRecord(identifier: string): AttemptRecord {
  if (typeof window === "undefined") {
    return { count: 0, lastAttemptTime: Date.now() };
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${identifier.toLowerCase()}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return { count: 0, lastAttemptTime: Date.now() };
}

function saveRecord(identifier: string, record: AttemptRecord) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${identifier.toLowerCase()}`,
      JSON.stringify(record)
    );
  } catch {}
}

export function checkAuthLockout(identifier: string): {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  attemptsLeft: number;
} {
  const record = getRecord(identifier);
  const now = Date.now();

  if (record.lockoutUntil && record.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      failedAttempts: record.count,
      attemptsLeft: 0,
    };
  }

  // If lockout expired, reset
  if (record.lockoutUntil && record.lockoutUntil <= now) {
    record.count = 0;
    delete record.lockoutUntil;
    saveRecord(identifier, record);
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: record.count,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - record.count),
  };
}

export function recordFailedAuthAttempt(identifier: string): {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  attemptsLeft: number;
} {
  const record = getRecord(identifier);
  const now = Date.now();

  record.count += 1;
  record.lastAttemptTime = now;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    saveRecord(identifier, record);
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      failedAttempts: record.count,
      attemptsLeft: 0,
    };
  }

  saveRecord(identifier, record);
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: record.count,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - record.count),
  };
}

export function resetAuthAttempts(identifier: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${identifier.toLowerCase()}`);
  } catch {}
}
