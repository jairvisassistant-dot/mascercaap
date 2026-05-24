/**
 * MFA Store — Temporary in-memory storage for MFA sessions.
 *
 * On login, if the user has MFA enabled, the Supabase session is stored here
 * temporarily while the second factor is completed.
 *
 * TTL: 5 minutes. The entry is automatically removed on expiry or after
 * successful verification.
 *
 * In-memory store: works for a single Next.js process.
 * For multi-instance deployments, migrate to an external store (Upstash Redis, etc.).
 */

export interface MfaSession {
  access_token: string;
  refresh_token: string;
  created_at: number;
}

const store = new Map<string, MfaSession>();
const TTL_MS = 5 * 60 * 1000;

export function createMfaToken(): string {
  return crypto.randomUUID();
}

export function setMfaSession(token: string, session: Omit<MfaSession, "created_at">): void {
  const now = Date.now();
  for (const [key, s] of store) {
    if (now - s.created_at > TTL_MS) store.delete(key);
  }

  store.set(token, {
    ...session,
    created_at: now,
  });
}

export function getMfaSession(token: string): MfaSession | null {
  const session = store.get(token);
  if (!session) return null;

  if (Date.now() - session.created_at > TTL_MS) {
    store.delete(token);
    return null;
  }

  return session;
}

export function deleteMfaSession(token: string): void {
  store.delete(token);
}
