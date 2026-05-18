import "server-only";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "admin_session";

/**
 * Crea un cliente de Supabase autenticado como admin a partir de la cookie.
 *
 * Util para operaciones que requieren autenticacion del usuario (MFA, etc.)
 * donde el service_role key NO es apropiado.
 *
 * Retorna { supabase, error }.
 * Si error no es null, el cliente no debe usarse.
 */
export async function getAdminClientFromCookie(
  cookieHeader: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ supabase: any; error: string | null }> {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`)
  );
  const token = match?.[1];

  if (!token) {
    return { supabase: null, error: "No autorizado" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { supabase: null, error: "Servicio no configurado" };
  }

  // Primero validar que el token es valido y pertenece al admin
  const validator = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await validator.auth.getUser(token);

  if (userError || !userData.user) {
    return { supabase: null, error: "Sesion invalida" };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userData.user.email !== adminEmail) {
    return { supabase: null, error: "No autorizado" };
  }

  // Crear cliente autenticado con el token existente
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return { supabase, error: null };
}
