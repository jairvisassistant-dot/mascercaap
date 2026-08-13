# Archived one-off scripts

Scripts in this directory are **one-off migrations and content fixes** that were
run once against Supabase and are kept here for reference / audit only. They are
not part of the application runtime and are not executed by any CI task.

Run them only if you understand what they do — most are NOT idempotent and were
written against a specific snapshot of the database.

## Index

| Script | Purpose | Status |
|---|---|---|
| `check-zumos-desc.ts` | Inspects `description` for the Limón zumo SKUs (limon-600/1000/2000/5000). Read-only. | Audit — already run. |
| `create-product-lines-table.ts` | Creates the `product_lines` table via Supabase RPC (`exec_sql`). If the RPC is unavailable, the DDL has to be run manually in the SQL Editor. | Migration — table created. |
| `fix-kumiss-yolito.ts` | Renames `kumiss-yolito-900ml` → `kumiss-yolito-250ml` and reorders dairy lines (Hato Kumis, Hato Yogurt, Yolito). Run **exactly once**. | Migration — applied. |
| `update-prices.ts` | Updates prices in Supabase from `Otros/Lista-Precios.md` and `Otros/Imagenes/ListaPreciosZumos.jpeg`. This one IS idempotent. | Re-runnable; superseded by the admin panel for ongoing price edits. |
| `update-zumos-benefits.ts` | Updates `benefits` for zumo products (source: `Beneficios.png` + an "easy to prepare" line). | Migration — applied. |
| `update-zumos-content.ts` | Updates `ingredients` and `benefits` for zumos; removes natural/no-preservative claims from juice products. | Migration — applied. |
| `update-zumos-descriptions.ts` | Fixes zumo `description` fields: previous copy suggested direct consumption, but these are concentrates that must be diluted. | Migration — applied. |

## When to run

- **Don't**, unless you are re-importing a dataset or recovering from a data
  loss. These scripts reflect a point-in-time content state.
- For ongoing edits (prices, descriptions, benefits, ordering) use the admin
  panel at `/admin/productos` and `/admin/lineas` — these are the supported
  paths and are revalidation-aware.

## How to run (if you must)

```bash
set -a && source .env.local && set +a
npx tsx scripts/archive/<script>.ts
```

> Each script loads `.env.local` directly. `@supabase/supabase-js` is a
> project dependency, so `tsx` resolves it via `node_modules` — no extra
> install needed.
