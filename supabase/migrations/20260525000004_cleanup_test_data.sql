-- ─── Cleanup: remove soft-deleted (test) products and lines ──────────────────
--
-- Context: the admin DELETE endpoint previously used soft-delete (active = false)
-- instead of a hard DELETE. This left test/deleted rows in the DB that were
-- still counted in totals and visible in admin dropdowns.
--
-- After this migration the DELETE endpoint uses a real hard DELETE, so this
-- state cannot accumulate again.
--
-- Order matters: products must be deleted before product_lines because of the
-- FK constraint fk_products_line (products.line → product_lines.key).

-- Step 1: hard-delete all soft-deleted products.
DELETE FROM products WHERE active = false;

-- Step 2: hard-delete all soft-deleted product_lines.
-- Safe to run after step 1 — no products reference them anymore.
DELETE FROM product_lines WHERE active = false;
