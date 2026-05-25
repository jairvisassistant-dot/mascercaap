-- ─── Document tables created directly in Supabase dashboard ─────────────────
--
-- product_categories and product_lines were created outside of migrations.
-- This migration documents their structure so the schema is reproducible.
-- Uses CREATE TABLE IF NOT EXISTS — safe to run even if tables already exist.

-- ─── product_categories ───────────────────────────────────────────────────────

create table if not exists product_categories (
  key           text primary key,
  label         text not null,
  description   text not null default '',
  display_order integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table product_categories enable row level security;

create policy if not exists "Lectura pública de categorías activas"
  on product_categories for select
  using (active = true);

create policy if not exists "Admin puede hacer todo en categorías"
  on product_categories for all
  using (auth.role() = 'authenticated');

drop trigger if exists set_product_categories_updated_at on product_categories;
create trigger set_product_categories_updated_at
  before update on product_categories
  for each row execute function update_updated_at();

-- ─── product_lines ────────────────────────────────────────────────────────────

create table if not exists product_lines (
  key           text primary key,
  label         text not null,
  description   text not null default '',
  gradient      text not null default 'from-lime-400 to-green-500',
  icon_emoji    text not null default '🛍️',
  chip_image    text,
  category_key  text references product_categories(key),
  display_order integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table product_lines enable row level security;

create policy if not exists "Lectura pública de líneas activas"
  on product_lines for select
  using (active = true);

create policy if not exists "Admin puede hacer todo en líneas"
  on product_lines for all
  using (auth.role() = 'authenticated');

drop trigger if exists set_product_lines_updated_at on product_lines;
create trigger set_product_lines_updated_at
  before update on product_lines
  for each row execute function update_updated_at();

-- ─── leads ────────────────────────────────────────────────────────────────────
-- Migration 20260513000003 adds columns to this table but never creates it.

create table if not exists leads (
  id                  text primary key,
  name                text not null,
  email               text not null,
  phone               text,
  message             text,
  estado_seguimiento  text not null default 'nuevo',
  notas               text,
  active              boolean not null default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table leads enable row level security;

drop trigger if exists set_leads_updated_at on leads;
create trigger set_leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- ─── testimonials: add missing updated_at ────────────────────────────────────

alter table testimonials
  add column if not exists updated_at timestamptz default now();

drop trigger if exists set_testimonials_updated_at on testimonials;
create trigger set_testimonials_updated_at
  before update on testimonials
  for each row execute function update_updated_at();
