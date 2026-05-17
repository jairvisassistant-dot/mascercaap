import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/layout/AdminNavbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Mas Cerca AP",
  robots: { index: false, follow: false },
};

async function getProductCount(): Promise<number | null> {
  if (!supabase) return null;
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  return count;
}

// TODO(infra): Admin should be deployed separately (subdomain/standalone) to reduce attack surface.
// Current mitigation: requireAdminAuth() on every admin route + session validation.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const productCount = await getProductCount();

  return (
    <div className="min-h-screen bg-surface-soft text-text-main antialiased">
      <AdminNavbar productCount={productCount} />
      <div className="pt-[92px]">
        {children}
      </div>
    </div>
  );
}
