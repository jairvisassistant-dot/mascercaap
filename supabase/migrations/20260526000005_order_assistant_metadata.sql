ALTER TABLE product_lines
ADD COLUMN IF NOT EXISTS order_assistant_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS order_assistant_label text;

UPDATE product_lines
SET order_assistant_enabled = true,
    order_assistant_label = CASE key
      WHEN 'pulpa-maracuya' THEN 'Maracuyá'
      WHEN 'pulpa-mora' THEN 'Mora'
      WHEN 'pulpa-mango' THEN 'Mango'
      WHEN 'pulpa-lulo' THEN 'Lulo'
      WHEN 'pulpa-guanabana' THEN 'Guanábana'
      WHEN 'pulpa-fresa' THEN 'Fresa'
      WHEN 'pulpa-guayaba' THEN 'Guayaba'
      WHEN 'pulpa-frutos-rojos' THEN 'Frutos Rojos'
      WHEN 'pulpa-frutos-amarillos' THEN 'Frutos Amarillos'
      WHEN 'pulpa-tomate-arbol' THEN 'Tomate de árbol'
      WHEN 'limon' THEN 'Limón'
      WHEN 'limonada-cereza' THEN 'Limonada con Cereza'
      WHEN 'limonada-coco' THEN 'Limonada con Coco'
      WHEN 'maracuya' THEN 'Maracuyá'
      WHEN 'kumiss-del-hato' THEN 'Kumis Del Hato 250ml'
      WHEN 'yogurt-del-hato' THEN 'Yogurt Del Hato 250ml'
      WHEN 'kumiss-yolito' THEN 'Kumis Yolito 250ml'
      ELSE order_assistant_label
    END
WHERE key IN (
  'pulpa-maracuya',
  'pulpa-mora',
  'pulpa-mango',
  'pulpa-lulo',
  'pulpa-guanabana',
  'pulpa-fresa',
  'pulpa-guayaba',
  'pulpa-frutos-rojos',
  'pulpa-frutos-amarillos',
  'pulpa-tomate-arbol',
  'limon',
  'limonada-cereza',
  'limonada-coco',
  'maracuya',
  'kumiss-del-hato',
  'yogurt-del-hato',
  'kumiss-yolito'
);
