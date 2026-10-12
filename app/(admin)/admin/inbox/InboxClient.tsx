"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CHAT_CLOSE_RESULTS,
  CHAT_MESSAGE_BODY_MAX_LENGTH,
  type ChatCloseResult,
  type ConversationStatus,
} from "@/lib/chat/types";
import {
  computeReplyError,
  formatDuration,
  formatRate,
  type InboxViewKind,
  resolveCloseConfirmation,
  resolveInboxViewState,
  resolveMetricsWindow,
  resolvePushUiState,
} from "@/lib/chat/inbox-utils";
import type { MetricsGranularity } from "@/lib/chat/metrics";
import {
  type ConversationDetail,
  type ConversationListItem,
  type MessageView,
  readResponse,
  sameOriginInit,
  useInboxBadge,
  useInboxThreads,
  usePushOptIn,
} from "./inbox-hooks";

/**
 * Coordinator inbox client.
 *
 * Every authorization decision lives on the server (admin/MFA boundary); this
 * component only carries a same-origin session and never sends a role or operator
 * identity. It renders the safe operational states (loading, empty, retry, access
 * denied, sign out) and exposes only support data: visitor name plus thread
 * contact details, never the internal conversation UUID (which travels as an
 * opaque handle). The workspace state and effects live in `./inbox-hooks`.
 */

/** Inbox tabs: the workspace and the aggregate operations report. */
type InboxTab = "threads" | "metrics";

const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Abierta",
  assigned: "Asignada",
  closed: "Cerrada",
};

const CLOSE_RESULT_LABELS: Record<ChatCloseResult, string> = {
  resuelto: "Resuelto",
  venta_o_pedido: "Venta o pedido",
  seguimiento: "Seguimiento",
  sin_respuesta_del_cliente: "Sin respuesta del cliente",
  sin_respuesta_de_la_coordinadora: "Sin respuesta de la coordinadora",
  fuera_de_alcance: "Fuera de alcance",
  "duplicado/spam": "Duplicado / spam",
};

/* ── Presentational pieces (static-markup testable) ───────────────── */

export function InboxNotice({
  variant,
  onRetry,
}: {
  readonly variant: "loading" | "empty" | "error" | "denied";
  readonly onRetry?: () => void;
}) {
  if (variant === "loading") {
    return (
      <div role="status" className="rounded-2xl border border-border-soft bg-surface-card p-6 text-sm text-text-muted">
        Cargando conversaciones…
      </div>
    );
  }
  if (variant === "empty") {
    return (
      <div role="status" className="rounded-2xl border border-border-soft bg-surface-card p-6 text-sm text-text-muted">
        No hay conversaciones
      </div>
    );
  }
  if (variant === "denied") {
    return (
      <div role="alert" className="rounded-2xl border border-border-soft bg-surface-card p-6">
        <p className="text-sm font-semibold text-text-main">Acceso denegado</p>
        <p className="mt-1 text-sm text-text-muted">
          Tu sesión no tiene permisos de coordinación. Inicia sesión con la cuenta de administración.
        </p>
        <form action="/api/admin/auth/logout" method="POST" className="mt-3">
          <button
            type="submit"
            className="rounded-xl border border-border-mid px-4 py-2 text-sm font-semibold text-text-sub hover:bg-surface-warm"
          >
            Salir
          </button>
        </form>
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-2xl border border-border-soft bg-surface-card p-6">
      <p className="text-sm font-semibold text-text-main">No se pudo cargar la bandeja</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/8"
      >
        Reintentar
      </button>
    </div>
  );
}

export type ConversationRowItem = {
  readonly conversationHandle: string;
  readonly status: ConversationStatus;
  readonly visitorName: string;
  readonly unreadCount: number;
  readonly lastMessageAt: string | null;
  readonly closeResult: ChatCloseResult | null;
};

export function ConversationRow({
  item,
  active,
  onSelect,
}: {
  readonly item: ConversationRowItem;
  readonly active: boolean;
  readonly onSelect: (handle: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.conversationHandle)}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left ${
        active ? "border-primary/50 bg-primary/8" : "border-border-soft bg-surface-card hover:bg-surface-warm"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-text-main">{item.visitorName}</span>
        <span className="mt-0.5 block text-xs text-text-muted">
          {STATUS_LABELS[item.status]}
          {item.closeResult ? ` · ${CLOSE_RESULT_LABELS[item.closeResult]}` : ""}
        </span>
      </span>
      {/* Ink on accent: white on #e58a22 is 2.62:1, below AA for 12px bold. */}
      {item.unreadCount > 0 ? (
        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-gray-900">
          {item.unreadCount}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Push-notification opt-in control. The permission prompt is requested only on
 * an explicit click, the toggle is derived (never free-form state), and a
 * blocked permission degrades to a static hint instead of a dead button.
 */
export function PushOptInControl({
  state,
  busy,
  onEnable,
  onDisable,
}: {
  readonly state: "hidden" | "off" | "on" | "blocked";
  readonly busy: boolean;
  readonly onEnable: () => void;
  readonly onDisable: () => void;
}) {
  if (state === "hidden") return null;
  if (state === "blocked") {
    return (
      <p className="text-xs text-text-muted">
        Las notificaciones están bloqueadas para este sitio. Actívalas en la configuración del navegador.
      </p>
    );
  }
  if (state === "on") {
    return (
      <button
        type="button"
        onClick={onDisable}
        disabled={busy}
        className="rounded-xl border border-border-mid px-3 py-1.5 text-xs font-semibold text-text-sub hover:bg-surface-warm disabled:opacity-50"
      >
        Desactivar notificaciones
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onEnable}
      disabled={busy}
      className="rounded-xl border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/8 disabled:opacity-50"
    >
      Activar notificaciones
    </button>
  );
}

/* ── Operations report (aggregate only, same MFA boundary) ──────────────── */

/** Latency statistics as the API reports them (seconds). */
type MetricsLatencyView = {
  readonly count: number;
  readonly medianSeconds: number;
  readonly p90Seconds: number;
};

type MetricsBucketView = {
  readonly bucketStart: string;
  readonly started: number;
  readonly closed: number;
  readonly purged: number;
  readonly reopened: number;
  readonly coordinatorUnanswered: number;
  readonly visitorAbandoned: number;
  readonly botEscalations: number;
  readonly classifiedClosed: number;
  readonly successRate: number | null;
  readonly firstResponse: MetricsLatencyView;
};

type MetricsSummaryView = {
  readonly started: number;
  readonly closed: number;
  readonly purged: number;
  readonly reopened: number;
  readonly coordinatorUnanswered: number;
  readonly visitorAbandoned: number;
  readonly botEscalations: number;
  readonly classifiedClosed: number;
  readonly successCount: number;
  readonly successRate: number | null;
  readonly closeResults: Readonly<Record<string, number>>;
  readonly intents: Readonly<Record<string, number>>;
  readonly firstResponse: MetricsLatencyView;
  readonly timeToClose: MetricsLatencyView;
  readonly consentGranted: number;
  readonly consentRevoked: number;
  readonly activeEligibleContacts: number;
  readonly unclassifiedClosed: number;
  readonly missingFirstResponse: number;
  readonly failedOutboxJobs: number;
};

type MetricsReportPayload = {
  readonly range: { readonly from: string; readonly to: string; readonly granularity: string };
  readonly buckets: readonly MetricsBucketView[];
  readonly summary: MetricsSummaryView;
  readonly slaCompliance: {
    readonly slaMinutes: number;
    readonly measured: number;
    readonly withinSla: number;
    readonly rate: number | null;
  } | null;
  readonly slaPending: boolean;
  readonly alerts: ReadonlyArray<{ readonly code: string; readonly count: number }>;
};


const METRICS_ALERT_LABELS: Readonly<Record<string, string>> = {
  unclassified_closed: "Cierres sin clasificar",
  missing_first_response: "Primera respuesta sin registrar",
  failed_outbox_jobs: "Correos fallidos en la cola",
  failed_cleanup_runs: "Limpiezas sin cierre registrado",
};

const METRICS_GRANULARITY_LABELS: Readonly<Record<MetricsGranularity, string>> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
};

/** The table markup for one report payload: counts, codes and dates only. */
export function MetricsReportTables({ report }: { readonly report: MetricsReportPayload }) {
  const { summary } = report;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">
        Ventana: {report.range.from} → {report.range.to} (UTC) ·{" "}
        {METRICS_GRANULARITY_LABELS[report.range.granularity as MetricsGranularity] ??
          report.range.granularity}
      </p>

      <table className="w-full border-collapse text-sm">
        <caption className="pb-2 text-left text-xs font-bold uppercase tracking-wide text-text-muted">
          Resumen
        </caption>
        <tbody className="align-top">
          <tr>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              Iniciadas / cerradas / purgadas
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {summary.started} / {summary.closed} / {summary.purged}
            </td>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              Reabiertas / escaladas por el bot
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {summary.reopened} / {summary.botEscalations}
            </td>
          </tr>
          <tr>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              Tasa de éxito
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {formatRate(summary.successRate)} ({summary.successCount}/{summary.classifiedClosed})
            </td>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              Sin respuesta de la coordinadora / abandonados
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {summary.coordinatorUnanswered} / {summary.visitorAbandoned}
            </td>
          </tr>
          <tr>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              Primera respuesta (mediana / p90)
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {formatDuration(summary.firstResponse.medianSeconds)} /{" "}
              {formatDuration(summary.firstResponse.p90Seconds)} ({summary.firstResponse.count})
            </td>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              Tiempo hasta cierre (mediana / p90)
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {formatDuration(summary.timeToClose.medianSeconds)} /{" "}
              {formatDuration(summary.timeToClose.p90Seconds)} ({summary.timeToClose.count})
            </td>
          </tr>
          <tr>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              Consentimientos otorgados / retirados / activos
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {summary.consentGranted} / {summary.consentRevoked} / {summary.activeEligibleContacts}
            </td>
            <th scope="row" className="border border-border-soft p-2 text-left font-semibold text-text-sub">
              SLA de primera respuesta
            </th>
            <td className="border border-border-soft p-2 text-text-main">
              {report.slaPending || report.slaCompliance === null ? (
                <span className="text-text-muted">Pendiente de definición (D3 abierto)</span>
              ) : (
                <span>
                  {report.slaCompliance.withinSla}/{report.slaCompliance.measured} dentro de{" "}
                  {report.slaCompliance.slaMinutes} min
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-sm">
        <caption className="pb-2 text-left text-xs font-bold uppercase tracking-wide text-text-muted">
          Por período
        </caption>
        <thead>
          <tr className="text-left text-xs text-text-muted">
            <th scope="col" className="border border-border-soft p-2 font-semibold">Periodo</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Iniciadas</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Cerradas</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Purgadas</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Reabiertas</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Sin respuesta</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Abandonados</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Escaladas</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">Éxito</th>
            <th scope="col" className="border border-border-soft p-2 font-semibold">1ª respuesta (mediana)</th>
          </tr>
        </thead>
        <tbody>
          {report.buckets.map((entry) => (
            <tr key={entry.bucketStart} className="text-text-main">
              <td className="border border-border-soft p-2">{entry.bucketStart}</td>
              <td className="border border-border-soft p-2">{entry.started}</td>
              <td className="border border-border-soft p-2">{entry.closed}</td>
              <td className="border border-border-soft p-2">{entry.purged}</td>
              <td className="border border-border-soft p-2">{entry.reopened}</td>
              <td className="border border-border-soft p-2">{entry.coordinatorUnanswered}</td>
              <td className="border border-border-soft p-2">{entry.visitorAbandoned}</td>
              <td className="border border-border-soft p-2">{entry.botEscalations}</td>
              <td className="border border-border-soft p-2">{formatRate(entry.successRate)}</td>
              <td className="border border-border-soft p-2">
                {entry.firstResponse.count > 0
                  ? formatDuration(entry.firstResponse.medianSeconds)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid gap-4 sm:grid-cols-2">
        <table className="w-full border-collapse text-sm">
          <caption className="pb-2 text-left text-xs font-bold uppercase tracking-wide text-text-muted">
            Resultados
          </caption>
          <tbody>
            {Object.keys(summary.closeResults).length === 0 ? (
              <tr>
                <td className="border border-border-soft p-2 text-text-muted">Sin cierres clasificados</td>
              </tr>
            ) : (
              Object.entries(summary.closeResults).map(([code, count]) => (
                <tr key={code}>
                  <th scope="row" className="border border-border-soft p-2 text-left font-normal text-text-sub">
                    {CLOSE_RESULT_LABELS[code as ChatCloseResult] ?? code}
                  </th>
                  <td className="border border-border-soft p-2 text-text-main">{count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <table className="w-full border-collapse text-sm">
          <caption className="pb-2 text-left text-xs font-bold uppercase tracking-wide text-text-muted">
            Intenciones del asistente
          </caption>
          <tbody>
            {Object.keys(summary.intents).length === 0 ? (
              <tr>
                <td className="border border-border-soft p-2 text-text-muted">Sin clasificaciones</td>
              </tr>
            ) : (
              Object.entries(summary.intents).map(([code, count]) => (
                <tr key={code}>
                  <th scope="row" className="border border-border-soft p-2 text-left font-normal text-text-sub">
                    {code}
                  </th>
                  <td className="border border-border-soft p-2 text-text-main">{count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Alertas de calidad</p>
        {report.alerts.length === 0 ? (
          <p className="mt-1 text-sm text-text-muted">Sin alertas en esta ventana.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1 text-sm text-text-sub">
            {report.alerts.map((alert) => (
              <li key={alert.code}>
                {METRICS_ALERT_LABELS[alert.code] ?? alert.code}: {alert.count}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-text-muted">
          Clasificaciones sin registrar: {summary.unclassifiedClosed} · Primera respuesta ausente:{" "}
          {summary.missingFirstResponse} · Correos fallidos: {summary.failedOutboxJobs}
        </p>
      </div>
    </div>
  );
}

/** Container: fetches the aggregate report for the selected window. */
export function MetricsReportView() {
  const [presetDays, setPresetDays] = useState(7);
  const [granularity, setGranularity] = useState<MetricsGranularity>("day");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [report, setReport] = useState<MetricsReportPayload | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { from, to } = resolveMetricsWindow({
        presetDays,
        todayIso: new Date().toISOString().slice(0, 10),
      });
      const query = new URLSearchParams({ from, to, granularity });
      const response = await fetch(
        `/api/chat/operator/metrics?${query.toString()}`,
        sameOriginInit()
      );
      const { state, data } = await readResponse(response);
      if (state === "denied") {
        setDenied(true);
        return;
      }
      if (state === "error") {
        setFailed(true);
        return;
      }
      const payload = data as { data: MetricsReportPayload };
      setReport(payload.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [presetDays, granularity]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  if (denied) {
    return <InboxNotice variant="denied" />;
  }

  return (
    <section
      aria-label="Métricas"
      className="flex flex-col gap-4 rounded-2xl border border-border-soft bg-surface-card p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Ventana
          <select
            value={presetDays}
            onChange={(event) => setPresetDays(Number(event.target.value))}
            className="rounded-xl border border-border-mid p-2 text-sm text-text-main"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Agrupación
          <select
            value={granularity}
            onChange={(event) => setGranularity(event.target.value as MetricsGranularity)}
            className="rounded-xl border border-border-mid p-2 text-sm text-text-main"
          >
            {(["day", "week", "month"] as const).map((value) => (
              <option key={value} value={value}>
                {METRICS_GRANULARITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void loadReport()}
          disabled={loading}
          className="rounded-xl border border-border-mid px-4 py-2 text-sm font-semibold text-text-sub hover:bg-surface-warm disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <p role="status" className="text-sm text-text-muted">
          Cargando métricas…
        </p>
      ) : failed ? (
        <p role="alert" className="text-sm text-red-600">
          No se pudieron cargar las métricas.
        </p>
      ) : report === null ? (
        <p className="text-sm text-text-muted">Sin datos en esta ventana.</p>
      ) : (
        <MetricsReportTables report={report} />
      )}
    </section>
  );
}

export default function InboxClient({
  pushPublicKey,
}: {
  readonly pushPublicKey: string;
}) {
  const {
    loading,
    denied,
    error,
    conversations,
    nextCursor,
    selectedHandle,
    detail,
    messages,
    reply,
    setReply,
    busy,
    actionError,
    loadConversations,
    openConversation,
    sendReply,
    closeConversation,
  } = useInboxThreads();
  const push = usePushOptIn({ denied, pushPublicKey });
  useInboxBadge(conversations);

  const [tab, setTab] = useState<InboxTab>("threads");

  const viewState = resolveInboxViewState({
    loading,
    denied,
    error,
    conversationCount: conversations.length,
  });

  const pushState = resolvePushUiState({
    supported: push.pushUiSupported,
    serverKeyConfigured: pushPublicKey !== "",
    permission:
      push.pushUiSupported && typeof Notification !== "undefined"
        ? Notification.permission
        : null,
    subscribed: push.pushSubscribed,
  });

  const tabBar = <InboxTabs tab={tab} onSelect={setTab} />;

  if (tab === "metrics") {
    return (
      <div className="flex flex-col gap-4">
        {tabBar}
        <MetricsReportView />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="lg:col-span-2">{tabBar}</div>
      <ConversationListPane
        viewKind={viewState.kind}
        conversations={conversations}
        selectedHandle={selectedHandle}
        nextCursor={nextCursor}
        pushState={pushState}
        pushBusy={push.pushBusy}
        onEnablePush={() => void push.enablePush()}
        onDisablePush={() => void push.disablePush()}
        onSelectConversation={(handle) => void openConversation(handle)}
        onLoadMore={(cursor) => void loadConversations(cursor)}
        onRetry={() => void loadConversations(null)}
      />
      <ThreadPane
        detail={detail}
        messages={messages}
        reply={reply}
        busy={busy}
        actionError={actionError}
        onReplyChange={setReply}
        onSend={() => void sendReply()}
        onClose={closeConversation}
      />
    </div>
  );
}

/** Maps the resolved workspace state to the notice variant it renders. */
function resolveNoticeVariant(kind: InboxViewKind): "loading" | "denied" | "empty" | "error" {
  if (kind === "loading") return "loading";
  if (kind === "denied") return "denied";
  if (kind === "empty") return "empty";
  return "error";
}

/** Inbox tab strip: the workspace and the aggregate operations report. */
function InboxTabs({
  tab,
  onSelect,
}: {
  readonly tab: InboxTab;
  readonly onSelect: (tab: InboxTab) => void;
}) {
  return (
    <div role="tablist" aria-label="Vistas de la bandeja" className="flex gap-2">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "threads"}
        onClick={() => onSelect("threads")}
        className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
          tab === "threads"
            ? "border-primary/60 bg-primary/10 text-text-main"
            : "border-border-mid text-text-sub hover:bg-surface-warm"
        }`}
      >
        Bandeja
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "metrics"}
        onClick={() => onSelect("metrics")}
        className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
          tab === "metrics"
            ? "border-primary/60 bg-primary/10 text-text-main"
            : "border-border-mid text-text-sub hover:bg-surface-warm"
        }`}
      >
        Métricas
      </button>
    </div>
  );
}

/** The conversation list pane: push opt-in, rows or notice, pagination. */
function ConversationListPane({
  viewKind,
  conversations,
  selectedHandle,
  nextCursor,
  pushState,
  pushBusy,
  onEnablePush,
  onDisablePush,
  onSelectConversation,
  onLoadMore,
  onRetry,
}: {
  readonly viewKind: InboxViewKind;
  readonly conversations: readonly ConversationListItem[];
  readonly selectedHandle: string | null;
  readonly nextCursor: string | null;
  readonly pushState: "hidden" | "off" | "on" | "blocked";
  readonly pushBusy: boolean;
  readonly onEnablePush: () => void;
  readonly onDisablePush: () => void;
  readonly onSelectConversation: (handle: string) => void;
  readonly onLoadMore: (cursor: string) => void;
  readonly onRetry: () => void;
}) {
  const rows = conversations.map((item) => (
    <ConversationRow
      key={item.conversationHandle}
      item={item}
      active={item.conversationHandle === selectedHandle}
      onSelect={(handle) => void onSelectConversation(handle)}
    />
  ));

  return (
    <section aria-label="Conversaciones" className="flex flex-col gap-2">
      <PushOptInControl
        state={pushState}
        busy={pushBusy}
        onEnable={onEnablePush}
        onDisable={onDisablePush}
      />
      {viewKind === "ready" ? (
        rows
      ) : (
        <InboxNotice variant={resolveNoticeVariant(viewKind)} onRetry={onRetry} />
      )}
      {nextCursor ? (
        <button
          type="button"
          onClick={() => void onLoadMore(nextCursor)}
          className="rounded-xl border border-border-mid px-4 py-2 text-sm font-semibold text-text-sub hover:bg-surface-warm"
        >
          Cargar más
        </button>
      ) : null}
    </section>
  );
}

/** The open-thread pane: placeholder hint or the full conversation thread. */
function ThreadPane({
  detail,
  messages,
  reply,
  busy,
  actionError,
  onReplyChange,
  onSend,
  onClose,
}: {
  readonly detail: ConversationDetail | null;
  readonly messages: MessageView[];
  readonly reply: string;
  readonly busy: boolean;
  readonly actionError: string | null;
  readonly onReplyChange: (value: string) => void;
  readonly onSend: () => void;
  readonly onClose: (input: {
    readonly closeResult: ChatCloseResult;
    readonly closeNote: string;
    readonly purge: boolean;
    readonly confirmPurge: boolean;
  }) => void;
}) {
  return (
    <section aria-label="Hilo" className="rounded-2xl border border-border-soft bg-surface-card p-4">
      {detail === null ? (
        <p className="text-sm text-text-muted">Selecciona una conversación para ver el hilo.</p>
      ) : (
        <ConversationThread
          detail={detail}
          messages={messages}
          reply={reply}
          busy={busy}
          actionError={actionError}
          onReplyChange={onReplyChange}
          onSend={onSend}
          onClose={onClose}
        />
      )}
    </section>
  );
}

function ConversationThread({
  detail,
  messages,
  reply,
  busy,
  actionError,
  onReplyChange,
  onSend,
  onClose,
}: {
  readonly detail: ConversationDetail;
  readonly messages: MessageView[];
  readonly reply: string;
  readonly busy: boolean;
  readonly actionError: string | null;
  readonly onReplyChange: (value: string) => void;
  readonly onSend: () => void;
  readonly onClose: (input: {
    closeResult: ChatCloseResult;
    closeNote: string;
    purge: boolean;
    confirmPurge: boolean;
  }) => void;
}) {
  const [closeResult, setCloseResult] = useState<ChatCloseResult | "">("");
  const [closeNote, setCloseNote] = useState("");
  const [purge, setPurge] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const replyError = computeReplyError(reply);

  return (
    <div className="flex flex-col gap-4">
      <header className="border-b border-border-soft pb-3">
        <p className="text-sm font-semibold text-text-main">{detail.visitorName}</p>
        <p className="text-xs text-text-muted">
          {detail.visitorEmail}
          {detail.visitorPhone ? ` · ${detail.visitorPhone}` : ""}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {STATUS_LABELS[detail.status]}
        </p>
      </header>

      <ol className="flex flex-col gap-2" role="log">
        {messages.length === 0 ? (
          <li className="text-sm text-text-muted">Todavía no hay mensajes.</li>
        ) : (
          messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-xl border p-2 text-sm ${
                message.senderType === "operator"
                  ? "border-primary/30 bg-primary/8"
                  : "border-border-soft bg-surface-warm"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {message.senderType === "operator"
                  ? "Coordinadora"
                  : message.senderType === "bot"
                    ? "Asistente"
                    : detail.visitorName}
              </span>
              <span className="mt-0.5 block whitespace-pre-wrap text-text-main">{message.body}</span>
            </li>
          ))
        )}
      </ol>

      {detail.status !== "closed" ? (
        <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
          <textarea
            value={reply}
            onChange={(event) => onReplyChange(event.target.value)}
            maxLength={CHAT_MESSAGE_BODY_MAX_LENGTH}
            rows={3}
            aria-label="Respuesta"
            className="w-full rounded-xl border border-border-mid p-2 text-sm"
            placeholder="Escribe una respuesta"
          />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              {reply.length}/{CHAT_MESSAGE_BODY_MAX_LENGTH}
            </span>
            <button
              type="button"
              onClick={onSend}
              disabled={busy || replyError !== null}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      ) : (
        <p className="border-t border-border-soft pt-3 text-sm text-text-muted">
          Conversación cerrada{detail.closeResult ? ` · ${CLOSE_RESULT_LABELS[detail.closeResult]}` : ""}.
        </p>
      )}

      {actionError ? (
        <p role="alert" className="text-sm text-red-600">
          {actionError}
        </p>
      ) : null}

      <CloseControls
        closeResult={closeResult}
        closeNote={closeNote}
        purge={purge}
        confirmPurge={confirmPurge}
        busy={busy}
        disabled={detail.status === "closed"}
        onCloseResult={setCloseResult}
        onCloseNote={setCloseNote}
        onPurge={(value) => {
          setPurge(value);
          if (!value) setConfirmPurge(false);
        }}
        onConfirmPurge={setConfirmPurge}
        onSubmit={() => {
          if (closeResult === "") return;
          onClose({ closeResult, closeNote, purge, confirmPurge });
        }}
      />
    </div>
  );
}

function CloseControls({
  closeResult,
  closeNote,
  purge,
  confirmPurge,
  busy,
  disabled,
  onCloseResult,
  onCloseNote,
  onPurge,
  onConfirmPurge,
  onSubmit,
}: {
  readonly closeResult: ChatCloseResult | "";
  readonly closeNote: string;
  readonly purge: boolean;
  readonly confirmPurge: boolean;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onCloseResult: (value: ChatCloseResult) => void;
  readonly onCloseNote: (value: string) => void;
  readonly onPurge: (value: boolean) => void;
  readonly onConfirmPurge: (value: boolean) => void;
  readonly onSubmit: () => void;
}) {
  const canSubmit =
    !disabled && !busy && resolveCloseConfirmation({ closeResult, purge, confirmPurge });

  return (
    <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Cierre</p>
      <select
        value={closeResult}
        disabled={disabled}
        onChange={(event) => onCloseResult(event.target.value as ChatCloseResult)}
        aria-label="Resultado del cierre"
        className="rounded-xl border border-border-mid p-2 text-sm"
      >
        <option value="">Clasificación obligatoria…</option>
        {CHAT_CLOSE_RESULTS.map((result) => (
          <option key={result} value={result}>
            {CLOSE_RESULT_LABELS[result]}
          </option>
        ))}
      </select>
      <input
        value={closeNote}
        disabled={disabled}
        onChange={(event) => onCloseNote(event.target.value)}
        maxLength={500}
        aria-label="Nota interna (opcional)"
        placeholder="Nota interna (opcional)"
        className="rounded-xl border border-border-mid p-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-text-sub">
        <input
          type="checkbox"
          checked={purge}
          disabled={disabled}
          onChange={(event) => onPurge(event.target.checked)}
        />
        Borrar registro (purga física)
      </label>
      {purge ? (
        <label className="flex items-center gap-2 text-sm font-semibold text-red-600">
          <input
            type="checkbox"
            checked={confirmPurge}
            disabled={disabled}
            onChange={(event) => onConfirmPurge(event.target.checked)}
          />
          Confirmo que esta acción elimina la conversación de forma irreversible
        </label>
      ) : null}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="rounded-xl border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
      >
        {purge ? "Cerrar y eliminar" : "Cerrar conversación"}
      </button>
    </div>
  );
}
