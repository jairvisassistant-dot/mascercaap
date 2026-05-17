import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  await requireAdminSession();
  redirect("/admin/productos");
}
