import { supabase } from "@/lib/supabase";
import AdminNavbar from "@/components/layout/AdminNavbar";

export const dynamic = "force-dynamic";

async function getProductCount(): Promise<number | null> {
  if (!supabase) return null;
  const { count } = await supabase
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
