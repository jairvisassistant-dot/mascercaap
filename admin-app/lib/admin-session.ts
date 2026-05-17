import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Validates the admin_session cookie in a Server Component.
 * - No cookie → redirect to /admin/login directly.
 * - Cookie exists but token is expired/invalid → redirect to the logout GET
 *   endpoint, which clears the cookie (a Route Handler CAN modify cookies)
 *   and then redirects to /admin/login. This breaks the redirect loop caused
 *   by stale cookies.
 */
export async function requireAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (!token) {
    redirect("/admin/login");
  }

  if (!supabase) {
    redirect("/admin/login");
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    // Can't delete cookies in a Server Component — delegate to the Route
    // Handler that IS allowed to modify cookies, then it redirects to /admin/login.
    redirect("/api/admin/auth/logout");
  }

  // Defense-in-depth: token is valid but must belong to the configured admin email.
  if (user.email !== process.env.ADMIN_EMAIL) {
    redirect("/api/admin/auth/logout");
  }

  return user;
}
