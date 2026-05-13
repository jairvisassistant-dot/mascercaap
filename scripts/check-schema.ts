import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function main() {
  const { error } = await sb.from("product_lines").select("key").limit(1);
  console.log("product_lines table:", error ? "NOT FOUND — " + error.message : "EXISTS");
  const { data: d2 } = await sb.from("products").select("line").limit(3);
  console.log("sample lines:", d2?.map(r => r.line));
}
main().catch(console.error);
