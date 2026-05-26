-- ─── Fix: product_line 'kumiss' tenía label 'Lácteos' igual que su categoría ──
--
-- La línea kumiss (Yogurt Del Hato, Kumis Del Hato, Kumis Yolito) tenía label
-- "Lácteos" — el mismo que la product_category. Esto hacía que "Lácteos"
-- apareciera en el dropdown de líneas como si fuera una categoría, no una línea.
-- El label correcto es "Kumiss y Yogurt" dado que esos son los productos reales.

UPDATE product_lines
SET label = 'Kumiss y Yogurt'
WHERE key = 'kumiss' AND label = 'Lácteos';
