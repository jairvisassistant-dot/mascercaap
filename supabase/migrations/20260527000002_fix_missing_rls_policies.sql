-- Fix: product_lines and product_categories have RLS enabled but no policies.
-- In PostgreSQL, RLS with zero policies = deny-all for all non-owner roles (anon, authenticated).
-- This caused getAllProductLines() and getAllProductCategories() to silently return [].
--
-- Root cause: migration 20260525000002 used CREATE TABLE IF NOT EXISTS — the tables
-- already existed (created via Supabase dashboard), so the TABLE block ran but the
-- POLICY block apparently did not persist. Re-creating them here unconditionally.

-- ── product_lines ──────────────────────────────────────────────────────────────

drop policy if exists "Lectura pública de líneas activas" on product_lines;
create policy "Lectura pública de líneas activas"
  on product_lines for select
  using (active = true);

drop policy if exists "Admin puede hacer todo en líneas" on product_lines;
create policy "Admin puede hacer todo en líneas"
  on product_lines for all
  using (auth.role() = 'authenticated');

-- ── product_categories ─────────────────────────────────────────────────────────

drop policy if exists "Lectura pública de categorías activas" on product_categories;
create policy "Lectura pública de categorías activas"
  on product_categories for select
  using (active = true);

drop policy if exists "Admin puede hacer todo en categorías" on product_categories;
create policy "Admin puede hacer todo en categorías"
  on product_categories for all
  using (auth.role() = 'authenticated');
