-- ─── Referential integrity: product hierarchy ────────────────────────────────
--
-- products.line → product_lines.key
-- product_lines.category_key → product_categories.key
--
-- Uses soft-delete (active = false), so FK references remain valid after
-- deactivation. Constraints prevent storing keys that never existed.

-- Step 1: remove data that violates the invariants we're about to enforce.

-- Wipe test/orphaned products whose line key has no entry in product_lines.
DELETE FROM products
WHERE line NOT IN (SELECT key FROM product_lines);

-- Null-out category references in lines that point to non-existent categories.
UPDATE product_lines
SET category_key = null
WHERE category_key IS NOT NULL
  AND category_key NOT IN (SELECT key FROM product_categories);

-- Step 2: add FK constraints.

ALTER TABLE products
  ADD CONSTRAINT fk_products_line
  FOREIGN KEY (line) REFERENCES product_lines(key);

ALTER TABLE product_lines
  ADD CONSTRAINT fk_product_lines_category_key
  FOREIGN KEY (category_key) REFERENCES product_categories(key);

-- Step 3: indexes on FK columns (prevents full table scan on JOINs and filters).

CREATE INDEX IF NOT EXISTS idx_products_line
  ON products (line);

CREATE INDEX IF NOT EXISTS idx_products_active
  ON products (active);

CREATE INDEX IF NOT EXISTS idx_product_lines_category_key
  ON product_lines (category_key);

CREATE INDEX IF NOT EXISTS idx_product_lines_active
  ON product_lines (active);

-- Step 4: check constraints for numeric sanity.

ALTER TABLE products
  ADD CONSTRAINT chk_products_price_positive
  CHECK (price IS NULL OR price > 0);

ALTER TABLE products
  ADD CONSTRAINT chk_products_display_order_positive
  CHECK (display_order >= 0);

ALTER TABLE products
  ADD CONSTRAINT chk_products_presentation_order_positive
  CHECK (presentation_order >= 0);
