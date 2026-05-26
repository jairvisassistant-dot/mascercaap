-- Cookieless analytics funnel tracking.
-- No PII collected (no IPs, no user agents, no session IDs).
-- First-party only: all events flow through /api/track using the service role key.
create table if not exists analytics_events (
  id         bigserial primary key,
  event_name text        not null,
  page       text,
  referrer   text,
  properties jsonb       not null default '{}',
  created_at timestamptz not null default now()
);

-- Optimise common queries: funnel by event type, time-series analysis.
create index analytics_events_name_idx       on analytics_events (event_name);
create index analytics_events_created_at_idx on analytics_events (created_at desc);

-- Row-level security: deny everything from the anon/public key.
-- Inserts happen server-side via service role (bypasses RLS).
alter table analytics_events enable row level security;
