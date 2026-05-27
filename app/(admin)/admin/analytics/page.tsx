import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/session";
import { supabase } from "@/lib/admin/supabase-service";

export const dynamic = "force-dynamic";

type FunnelRow = { event_name: string; total: number };
type ConversionRow = { day: string; page_views: number; whatsapp_clicks: number; conversion_pct: number | null };
type PageViewRow = { page: string | null; views: number };
type ProductViewRow = { line: string | null; presentation: string | null; views: number };

const NUMBER_FORMATTER = new Intl.NumberFormat("es-CO");

function formatNumber(value: number | null | undefined) {
  return NUMBER_FORMATTER.format(value ?? 0);
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value.toFixed(2)}%`;
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  await requireAdminSession();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Supabase admin no está disponible. Configurá `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` para ver analytics.
        </div>
      </div>
    );
  }

  const [funnelRes, conversionRes, pagesRes, productRes] = await Promise.all([
    supabase.from("v_funnel_summary").select("event_name, total"),
    supabase.from("v_whatsapp_conversion_daily").select("day, page_views, whatsapp_clicks, conversion_pct").order("day", { ascending: false }).limit(14),
    supabase.from("v_page_views_by_path").select("page, views").order("views", { ascending: false }).limit(10),
    supabase.from("v_product_views").select("line, presentation, views").order("views", { ascending: false }).limit(10),
  ]);

  const firstError = funnelRes.error ?? conversionRes.error ?? pagesRes.error ?? productRes.error;

  if (firstError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar el panel de analytics: {firstError.message}
        </div>
      </div>
    );
  }

  const funnel = (funnelRes.data ?? []) as FunnelRow[];
  const conversion = (conversionRes.data ?? []) as ConversionRow[];
  const pages = (pagesRes.data ?? []) as PageViewRow[];
  const products = (productRes.data ?? []) as ProductViewRow[];

  const funnelMap = new Map(funnel.map((row) => [row.event_name, row.total]));
  const latestConversion = conversion[0]?.conversion_pct ?? null;

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">Operaciones</p>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-main">Analytics</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-muted">
            Panel operativo del embudo real. Usalo para revisar tráfico, aperturas de ayuda, clicks a WhatsApp y demanda por producto antes de cambiar CTAs o flujo comercial.
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1680px] gap-6 p-6 pt-0 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Page views" value={formatNumber(funnelMap.get("page_view"))} tone="primary" />
            <MetricCard label="Clicks a WhatsApp" value={formatNumber(funnelMap.get("cta_whatsapp"))} tone="accent" />
            <MetricCard label="Aperturas HelpHub" value={formatNumber(funnelMap.get("helphub_open"))} tone="default" />
            <MetricCard label="Conversión WA reciente" value={formatPercent(latestConversion)} tone="accent" />
          </div>

          <DataPanel title="Conversión diaria a WhatsApp" subtitle="Últimos 14 días según las vistas KPI de Supabase.">
            <Table
              headers={["Día", "Page views", "Clicks WA", "Conversión"]}
              rows={conversion.map((row) => [
                formatDay(row.day),
                formatNumber(row.page_views),
                formatNumber(row.whatsapp_clicks),
                formatPercent(row.conversion_pct),
              ])}
              emptyText="Todavía no hay datos diarios para mostrar."
            />
          </DataPanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <DataPanel title="Páginas más vistas" subtitle="Sirve para detectar dónde conviene optimizar copy o jerarquía de CTA.">
              <Table
                headers={["Ruta", "Views"]}
                rows={pages.map((row) => [row.page ?? "(sin ruta)", formatNumber(row.views)])}
                emptyText="Sin page views registradas todavía."
              />
            </DataPanel>

            <DataPanel title="Interés por producto" subtitle="Lectura rápida de demanda por línea y presentación.">
              <Table
                headers={["Línea", "Presentación", "Views"]}
                rows={products.map((row) => [row.line ?? "—", row.presentation ?? "—", formatNumber(row.views)])}
                emptyText="Sin aperturas de lightbox registradas todavía."
              />
            </DataPanel>
          </div>
        </section>

        <aside className="space-y-6">
          <DataPanel title="Ritual de uso" subtitle="La meta NO es coleccionar eventos. Es decidir mejor.">
            <ol className="space-y-3 text-sm text-text-muted">
              <li>1. Revisá conversión a WhatsApp de los últimos 7 días.</li>
              <li>2. Detectá una sola oportunidad principal.</li>
              <li>3. Formulá una hipótesis concreta sobre CTA/copy/jerarquía.</li>
              <li>4. Aplicá un cambio chico.</li>
              <li>5. Volvé a medir la semana siguiente.</li>
            </ol>
          </DataPanel>

          <DataPanel title="KPI oficiales" subtitle="Definidos en `docs/analytics-ops-playbook.md`.">
            <ul className="space-y-3 text-sm text-text-muted">
              <li><strong className="text-text-main">Tráfico total:</strong> page views acumulados.</li>
              <li><strong className="text-text-main">Ayuda activada:</strong> aperturas de HelpHub.</li>
              <li><strong className="text-text-main">Salida comercial:</strong> clicks a WhatsApp.</li>
              <li><strong className="text-text-main">Conversión:</strong> `cta_whatsapp / page_view`.</li>
              <li><strong className="text-text-main">Demanda:</strong> vistas por línea/presentación.</li>
            </ul>
          </DataPanel>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "default" }) {
  const toneClass = tone === "primary"
    ? "border-primary/20 bg-primary/8"
    : tone === "accent"
      ? "border-accent/25 bg-accent/10"
      : "border-border-soft bg-surface-card";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-text-main">{value}</p>
    </div>
  );
}

function DataPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border-soft bg-surface-card p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.18)]">
      <div className="mb-4">
        <h2 className="text-base font-bold text-text-main">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Table({ headers, rows, emptyText }: { headers: string[]; rows: string[][]; emptyText: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-[0.16em] text-text-muted">
            {headers.map((header) => (
              <th key={header} className="px-0 py-3 pr-4 font-bold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-border-soft/70 last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-0 py-3 pr-4 text-text-sub">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
