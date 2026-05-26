import { requireAdminSession } from "@/lib/admin/session";
import { supabase } from "@/lib/admin/supabase-service";

export const dynamic = "force-dynamic";

type CSPRow = {
  id: number;
  document_uri: string | null;
  violated_directive: string | null;
  effective_directive: string | null;
  blocked_uri: string | null;
  disposition: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CSPReportsPage() {
  await requireAdminSession();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Supabase admin no está disponible. No se pueden consultar reportes CSP.
        </div>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("csp_violation_reports")
    .select("id, document_uri, violated_directive, effective_directive, blocked_uri, disposition, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los reportes CSP: {error.message}
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as CSPRow[];
  const byDirective = new Map<string, number>();
  for (const row of rows) {
    const key = row.effective_directive ?? row.violated_directive ?? "unknown";
    byDirective.set(key, (byDirective.get(key) ?? 0) + 1);
  }
  const topDirectives = Array.from(byDirective.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const latestReportAt = rows[0]?.created_at ? formatDate(rows[0].created_at) : "—";

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">Sistema</p>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-main">CSP / Violaciones reportadas</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted">
            Vista operativa para endurecer Content Security Policy por fases sin romper runtime. La política objetivo corre en report-only y los reportes se almacenan acá para revisión.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1680px] space-y-6 p-6 pt-0 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card label="Reportes almacenados" value={String(rows.length)} />
          <Card label="Último reporte" value={latestReportAt} />
          <Card label="Directiva más ruidosa" value={topDirectives[0]?.[0] ?? "—"} />
        </div>

        <section className="rounded-3xl border border-border-soft bg-surface-card p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.18)]">
          <h2 className="text-base font-bold text-text-main">Top directivas con más ruido</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {topDirectives.length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no llegaron violaciones persistidas.</p>
            ) : topDirectives.map(([directive, count]) => (
              <div key={directive} className="rounded-2xl border border-border-soft bg-surface-page p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">Directiva</p>
                <p className="mt-2 font-semibold text-text-main">{directive}</p>
                <p className="mt-1 text-sm text-text-muted">{count} reporte(s)</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border-soft bg-surface-card p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.18)]">
          <h2 className="text-base font-bold text-text-main">Últimas violaciones</h2>
          <p className="mt-1 text-sm text-text-muted">Usá esta tabla para detectar causas raíz antes de promover endurecimientos al header bloqueante.</p>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">Sin reportes registrados todavía.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-[0.16em] text-text-muted">
                    <th className="px-0 py-3 pr-4 font-bold">Fecha</th>
                    <th className="px-0 py-3 pr-4 font-bold">Ruta</th>
                    <th className="px-0 py-3 pr-4 font-bold">Directiva</th>
                    <th className="px-0 py-3 pr-4 font-bold">Blocked URI</th>
                    <th className="px-0 py-3 pr-0 font-bold">Modo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border-soft/70 last:border-b-0">
                      <td className="px-0 py-3 pr-4 text-text-sub">{formatDate(row.created_at)}</td>
                      <td className="px-0 py-3 pr-4 text-text-sub">{row.document_uri ?? "—"}</td>
                      <td className="px-0 py-3 pr-4 text-text-sub">{row.effective_directive ?? row.violated_directive ?? "—"}</td>
                      <td className="px-0 py-3 pr-4 text-text-sub">{row.blocked_uri ?? "—"}</td>
                      <td className="px-0 py-3 pr-0 text-text-sub">{row.disposition ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-text-main">{value}</p>
    </div>
  );
}
