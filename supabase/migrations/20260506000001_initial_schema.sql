-- ─── Tabla products ───────────────────────────────────────────────────────────

create table if not exists products (
  id                  text primary key,
  name                text not null,
  line                text not null,
  presentation        text not null,
  presentation_order  integer not null default 0,
  price               numeric,
  image               text,
  description         text not null,
  ingredients         text[],
  benefits            text[],
  is_sold_out         boolean not null default false,
  is_best_seller      boolean not null default false,
  featured            boolean not null default false,
  active              boolean not null default true,
  display_order       integer not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─── Tabla testimonials ───────────────────────────────────────────────────────

create table if not exists testimonials (
  id          text primary key,
  name        text not null,
  role        text not null,
  role_en     text,
  text        text not null,
  text_en     text,
  rating      integer not null check (rating between 1 and 5),
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table products enable row level security;
alter table testimonials enable row level security;

create policy "Lectura pública de productos activos"
  on products for select
  using (active = true);

create policy "Lectura pública de testimonios activos"
  on testimonials for select
  using (active = true);

create policy "Admin puede hacer todo en productos"
  on products for all
  using (auth.role() = 'authenticated');

create policy "Admin puede hacer todo en testimonios"
  on testimonials for all
  using (auth.role() = 'authenticated');

-- ─── Trigger updated_at automático ───────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on products
  for each row execute function update_updated_at();
