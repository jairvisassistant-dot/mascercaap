-- Restructures Lácteos product lines: replaces the single shared "kumiss" line
-- with three individual lines (one per product) so each product's price can be
-- resolved independently via line:presentation in buildPriceResolver.
--
-- Root cause: kumiss-del-hato-250ml, yogurt-del-hato-250ml, and kumiss-yolito-250ml
-- all shared line = "kumiss" + presentation = "250ml", causing a key collision in
-- byLinePresentation — only the last processed price survived, and the Lácteos
-- resolver path (presentation IS NULL) was unreachable due to NOT NULL constraint.

-- Step 1: insert individual product_lines, inheriting metadata from "kumiss"
INSERT INTO product_lines (key, label, description, gradient, icon_emoji, category_key, display_order, active)
SELECT 'kumiss-del-hato', 'Kumis Del Hato', description, gradient, icon_emoji, category_key, 100, active
FROM product_lines WHERE key = 'kumiss'
ON CONFLICT (key) DO NOTHING;

INSERT INTO product_lines (key, label, description, gradient, icon_emoji, category_key, display_order, active)
SELECT 'yogurt-del-hato', 'Yogurt Del Hato', description, gradient, icon_emoji, category_key, 101, active
FROM product_lines WHERE key = 'kumiss'
ON CONFLICT (key) DO NOTHING;

INSERT INTO product_lines (key, label, description, gradient, icon_emoji, category_key, display_order, active)
SELECT 'kumiss-yolito', 'Kumis Yolito', description, gradient, icon_emoji, category_key, 102, active
FROM product_lines WHERE key = 'kumiss'
ON CONFLICT (key) DO NOTHING;

-- Step 2: update products to reference their individual line (FK constraint requires
-- the new product_lines rows to exist first — handled by Step 1 above)
UPDATE products SET line = 'kumiss-del-hato' WHERE id = 'kumiss-del-hato-250ml';
UPDATE products SET line = 'yogurt-del-hato' WHERE id = 'yogurt-del-hato-250ml';
UPDATE products SET line = 'kumiss-yolito'   WHERE id = 'kumiss-yolito-250ml';

-- Step 3: deactivate the umbrella "kumiss" line (soft-delete; FK remains valid)
UPDATE product_lines SET active = false WHERE key = 'kumiss';
