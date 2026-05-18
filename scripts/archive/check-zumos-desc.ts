import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id, description")
    .in("id", ["limon-600", "limon-1000", "limon-2000", "limon-5000"])
    .order("id");

  if (error) { console.error(error.message); return; }
  data?.forEach(p => console.log(`${p.id}:\n  ${p.description}\n`));
}
main().catch(console.error);
