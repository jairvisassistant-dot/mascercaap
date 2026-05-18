/**
 * MFA Store — Almacenamiento temporal en memoria para sesiones MFA.
 *
 * Al hacer login, si el usuario tiene MFA habilitado, la sesión de Supabase
 * se guarda temporalmente aquí mientras se completa el segundo factor.
 *
 * TTL: 5 minutos. La entrada se elimina automáticamente al expirar o al
 * completar la verificación.
 *
 * ⚠️ Store en memoria: funciona para un solo proceso de Next.js.
 *    Si se escala a múltiples instancias, migrar a una store externa
 *    (Upstash Redis, base de datos, etc.).
 */

export interface MfaSession {
  access_token: string;
  refresh_token: string;
  created_at: number;
}

const store = new Map<string, MfaSession>();
const TTL_MS = 5 * 60 * 1000;

/** Genera un token único para identificar la sesión MFA. */
export function createMfaToken(): string {
  // crypto.randomUUID() disponible en Node 19+
  return crypto.randomUUID();
}

/** Guarda una sesión MFA asociada a un token. */
export function setMfaSession(token: string, session: Omit<MfaSession, "created_at">): void {
  // Limpieza oportunista: eliminar expiradas
  const now = Date.now();
  for (const [key, s] of store) {
    if (now - s.created_at > TTL_MS) store.delete(key);
  }

  store.set(token, {
    ...session,
    created_at: now,
  });
}

/** Recupera una sesión MFA si el token es válido y no expiró. */
export function getMfaSession(token: string): MfaSession | null {
  const session = store.get(token);
  if (!session) return null;

  if (Date.now() - session.created_at > TTL_MS) {
    store.delete(token);
    return null;
  }

  return session;
}

/** Elimina una sesión MFA (usado después de verify exitoso). */
export function deleteMfaSession(token: string): void {
  store.delete(token);
}
