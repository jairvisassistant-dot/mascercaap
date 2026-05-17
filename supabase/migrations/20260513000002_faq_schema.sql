-- ─── FAQ categories ──────────────────────────────────────────────────────────

create table if not exists faq_categories (
  id            text primary key,
  label_es      text not null,
  label_en      text not null,
  icon          text not null default '❓',
  display_order integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── FAQ questions ───────────────────────────────────────────────────────────

create table if not exists faq_questions (
  id            text primary key,
  category_id   text not null references faq_categories(id) on delete cascade,
  question_es   text not null,
  question_en   text not null,
  answer_es     text not null,
  answer_en     text not null,
  keywords      text[] not null default '{}',
  display_order integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── FAQ config ───────────────────────────────────────────────────────────────

create table if not exists faq_config (
  id          integer primary key default 1,
  fallback_es text not null,
  fallback_en text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  constraint faq_config_single_row check (id = 1)
);

insert into faq_config (id, fallback_es, fallback_en)
values (
  1,
  'No tengo información sobre eso. ¿Te gustaría hablar directamente con nuestro equipo?',
  'I don''t have information about that. Would you like to talk directly with our team?'
)
on conflict (id) do nothing;

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table faq_categories enable row level security;
alter table faq_questions enable row level security;
alter table faq_config enable row level security;

create policy "Lectura pública de categorías FAQ activas"
  on faq_categories for select
  using (active = true);

create policy "Lectura pública de preguntas FAQ activas"
  on faq_questions for select
  using (active = true);

create policy "Lectura pública de FAQ config"
  on faq_config for select
  using (true);

create policy "Admin puede hacer todo en categorías FAQ"
  on faq_categories for all
  using (auth.role() = 'authenticated');

create policy "Admin puede hacer todo en preguntas FAQ"
  on faq_questions for all
  using (auth.role() = 'authenticated');

create policy "Admin puede hacer todo en FAQ config"
  on faq_config for all
  using (auth.role() = 'authenticated');

-- ─── Trigger updated_at automático ───────────────────────────────────────────

create trigger set_faq_categories_updated_at
  before update on faq_categories
  for each row execute function update_updated_at();

create trigger set_faq_questions_updated_at
  before update on faq_questions
  for each row execute function update_updated_at();

create trigger set_faq_config_updated_at
  before update on faq_config
  for each row execute function update_updated_at();
