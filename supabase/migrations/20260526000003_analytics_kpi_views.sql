-- KPI views for analytics_events funnel exploitation.
-- All views are read-only; no existing tables or data are modified.

-- Daily event counts by type (time-series for trend analysis)
create or replace view v_daily_events as
select
  date_trunc('day', created_at) as day,
  event_name,
  count(*)::int                 as total
from analytics_events
group by 1, 2
order by 1 desc, 2;

-- Overall funnel summary (total per event, all time)
create or replace view v_funnel_summary as
select
  event_name,
  count(*)::int as total
from analytics_events
group by event_name
order by total desc;

-- Page views grouped by path (content popularity)
create or replace view v_page_views_by_path as
select
  page,
  count(*)::int as views
from analytics_events
where event_name = 'page_view'
group by page
order by views desc;

-- WhatsApp conversion rate per day
-- Rate = cta_whatsapp / page_view for the same day
create or replace view v_whatsapp_conversion_daily as
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
create or replace view v_product_views as
select
  properties->>'line'         as line,
  properties->>'presentation' as presentation,
  count(*)::int               as views
from analytics_events
where event_name = 'product_view'
group by 1, 2
order by views desc;
