-- ─── Agregar columnas de seguimiento a leads ─────────────────────────────────

alter table if exists leads
  add column if not exists estado_seguimiento text not null default 'nuevo',
  add column if not exists notas text;

-- ─── RLS: admin puede leer/actualizar todas las columnas ─────────────────────

create policy if not exists "Admin puede hacer todo en leads"
  on leads for all
  using (auth.role() = 'authenticated');

-- ─── Trigger updated_at automático ───────────────────────────────────────────

create trigger if not exists set_leads_updated_at
  before update on leads
  for each row execute function update_updated_at();
