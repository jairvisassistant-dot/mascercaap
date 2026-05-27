-- Security hardening: ensure RLS on catalog tables + fix SECURITY DEFINER views.
-- Resolves Supabase lint: "RLS Disabled in Public" and "Security Definer View".

-- ============================================================================
-- 1. RLS on product_categories and product_lines (idempotent)
-- ============================================================================
-- These tables already have RLS enabled in migration 20260525000002, but we
-- re-enable here to guarantee the lint passes regardless of migration order
-- or partial-application scenarios.

alter table product_categories enable row level security;
alter table product_lines enable row level security;

-- Policies already exist from 20260525000002 (IF NOT EXISTS), so we don't
-- recreate them here. If they were dropped, re-run that migration.

-- ============================================================================
-- 2. Fix SECURITY DEFINER on analytics views
-- ============================================================================
-- Without `security_invoker = true`, PostgreSQL defaults these views to
-- SECURITY DEFINER, meaning they run as the view owner and bypass RLS on
-- the underlying `analytics_events` table.
--
-- `analytics_events` has RLS enabled with zero policies (deny-all), so only
-- the service role can read it. With SECURITY DEFINER, any user who can
-- query the view would see aggregated analytics data — a data leak.
--
-- With `security_invoker = true`, the querying user's permissions are checked
-- against the underlying table. Since anon users have no RLS policy granting
-- access to `analytics_events`, they see nothing (correct behavior).
-- The service role (used by admin pages) bypasses RLS and sees everything.

-- Daily event counts by type (time-series for trend analysis)
create or replace view v_daily_events with (security_invoker = true) as
select
  date_trunc('day', created_at) as day,
  event_name,
  count(*)::int                 as total
from analytics_events
group by 1, 2
order by 1 desc, 2;

-- Overall funnel summary (total per event, all time)
create or replace view v_funnel_summary with (security_invoker = true) as
select
  event_name,
  count(*)::int as total
from analytics_events
group by event_name
order by total desc;

-- Page views grouped by path (content popularity)
create or replace view v_page_views_by_path with (security_invoker = true) as
select
  page,
  count(*)::int as views
from analytics_events
where event_name = 'page_view'
group by page
order by views desc;

-- WhatsApp conversion rate per day
-- Rate = cta_whatsapp / page_view for the same day
create or replace view v_whatsapp_conversion_daily with (security_invoker = true) as
select
  day,
  max(case when event_name = 'page_view'    then total else 0 end) as page_views,
  max(case when event_name = 'cta_whatsapp' then total else 0 end) as whatsapp_clicks,
  round(
    max(case when event_name = 'cta_whatsapp' then total else 0 end)::numeric
    / nullif(max(case when event_name = 'page_view' then total else 0 end), 0) * 100,
    2
  ) as conversion_pct
from v_daily_events
group by day
order by day desc;

-- Product views by line and presentation (catalog demand signal)
create or replace view v_product_views with (security_invoker = true) as
select
  properties->>'line'         as line,
  properties->>'presentation' as presentation,
  count(*)::int               as views
from analytics_events
where event_name = 'product_view'
group by 1, 2
order by views desc;
