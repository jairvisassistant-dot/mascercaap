import type { Metadata } from "next";
import { headers } from "next/headers";
import { supabase } from "@/lib/admin/supabase-service";
import { requireAdminSession } from "@/lib/admin/session";
import AdminNavbar from "@/components/admin/AdminNavbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Mas Cerca AP",
  robots: { index: false, follow: false },
};

async function getProductCount(): Promise<number | null> {
  if (!supabase) return null;
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  return count;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  if (!pathname.startsWith("/admin/login")) {
    await requireAdminSession();
  }
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
