import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import AdminNavbar from "@/components/layout/AdminNavbar";

export const metadata: Metadata = {
  title: "Admin — Mas Cerca AP",
  robots: { index: false, follow: false },
};

async function getProductCount(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { count } = await createClient(url, key, { auth: { persistSession: false } })
    .from("products")
    .select("*", { count: "exact", head: true });
  return count;
}

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
