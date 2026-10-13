import { requireAdminSession } from "@/lib/admin/session";
import { resolveVapidConfig } from "@/lib/chat/push";
import InboxClient from "./InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  await requireAdminSession();

  // Only the *public* half of the VAPID pair ever leaves the server, and it is
  // pushed down as a prop rather than fetched from the client. That removes the
  // mount-time `fetch` from the effect (which could race, double-fire under
  // Strict Mode, or leak) while keeping the key server-owned config. An
  // unconfigured deployment resolves to "" and the opt-in control stays hidden.
  const pushPublicKey = resolveVapidConfig(process.env)?.publicKey ?? "";

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Administración
        </p>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-main">Bandeja de chat</h1>
          <p className="mt-1 text-sm text-text-muted">
            Conversaciones de clientes atendidas por la coordinadora. Atiende, clasifica y cierra
            cada hilo.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 pt-0 lg:px-8">
        <InboxClient pushPublicKey={pushPublicKey} />
      </div>
    </div>
  );
}
