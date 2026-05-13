import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-session";
import ConsultasList from "./ConsultasList";

export const dynamic = "force-dynamic";

export default async function ConsultasPage() {
  await requireAdminSession();

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await sb
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as {
    id: string;
    nombre: string;
    email: string | null;
    tipo: string;
    producto_interes: string | null;
    preguntas_bot: string[];
    resumen_handoff: string | null;
    fuente: string;
    whatsapp_number: string | null;
    consent_accepted: boolean;
    created_at: string;
    estado_seguimiento: string;
    notas: string | null;
  }[];

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Administración
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-main">Consultas</h1>
            <p className="mt-1 text-sm text-text-muted">
              Leads, pedidos y consultas entrantes desde el chatbot y asistente de pedidos.
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 pt-0 lg:px-8">
        <ConsultasList initial={leads} />
      </div>
    </div>
  );
}
