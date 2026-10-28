import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Database } from 'sql.js';
import { queryOne, execute } from './db.js';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function cleanPhone(raw: string): string {
  if (!raw) return '';
  // Remove non-digit characters
  let digits = raw.replace(/\D/g, '');
  // If starts with 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  // If starts with 0 and has 11 digits, strip 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  return digits;
}

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

export function isValidUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://')) && !trimmed.startsWith('javascript:');
}

export function generateOrderCode(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${rand}`;
}

export function generateTaskCode(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `TSK-${rand}`;
}

export function checkLockout(db: Database, identifier: string, ip: string): boolean {
  const key = `${ip}_${identifier.toLowerCase().trim()}`;
  const row = queryOne<{ attempts: number; locked_until: string }>(
    db,
    `SELECT attempts, locked_until FROM login_lockouts WHERE key = ?`,
    [key]
  );

  if (row && row.locked_until) {
    const lockedUntil = new Date(row.locked_until).getTime();
    if (Date.now() < lockedUntil) {
      return true; // Still locked
    } else {
      // Lock expired, reset
      execute(db, `DELETE FROM login_lockouts WHERE key = ?`, [key]);
      return false;
    }
  }
  return false;
}

export function recordFailedAttempt(db: Database, identifier: string, ip: string): { locked: boolean; remaining: number } {
  const key = `${ip}_${identifier.toLowerCase().trim()}`;
  const row = queryOne<{ attempts: number; locked_until: string }>(
    db,
    `SELECT attempts, locked_until FROM login_lockouts WHERE key = ?`,
    [key]
  );

  const attempts = (row?.attempts || 0) + 1;
  if (attempts >= 5) {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    execute(
      db,
      `INSERT OR REPLACE INTO login_lockouts (key, attempts, locked_until) VALUES (?, ?, ?)`,
      [key, attempts, lockedUntil]
    );
    return { locked: true, remaining: 0 };
  } else {
    execute(
      db,
      `INSERT OR REPLACE INTO login_lockouts (key, attempts, locked_until) VALUES (?, ?, NULL)`,
      [key, attempts]
    );
    return { locked: false, remaining: 5 - attempts };
  }
}

export function resetLockout(db: Database, identifier: string, ip: string): void {
  const key = `${ip}_${identifier.toLowerCase().trim()}`;
  execute(db, `DELETE FROM login_lockouts WHERE key = ?`, [key]);
}

// Dummy hash for timing attack mitigation
export const DUMMY_HASH = bcrypt.hashSync('dummy_salt_password_123', 10);
