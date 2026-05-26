-- Persistent CSP report sink for progressive hardening.
create table if not exists csp_violation_reports (
  id bigserial primary key,
  document_uri text,
  violated_directive text,
  effective_directive text,
  original_policy text,
  blocked_uri text,
  source_file text,
  line_number integer,
  column_number integer,
  status_code integer,
  disposition text,
  raw_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists csp_violation_reports_created_at_idx
  on csp_violation_reports (created_at desc);

create index if not exists csp_violation_reports_effective_directive_idx
  on csp_violation_reports (effective_directive);

alter table csp_violation_reports enable row level security;
