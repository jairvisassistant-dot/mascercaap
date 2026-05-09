# GUÍA DE GENERACIÓN DE IMÁGENES — PULPAS DE FRUTA
## Mas Cerca AP — Referencia para MidJourney

> Este documento es la fuente de verdad para la generación de todas las imágenes
> de producto de la línea de Pulpas de Fruta. Leerlo completo antes de generar
> cualquier imagen. ~27 imágenes en total (9 sabores × 3 presentaciones).

---

## 1. CONTEXTO DE USO WEB

- Las imágenes se muestran en el componente `ProductCard` (`components/ui/ProductCard.tsx`)
- Dimensión del contenedor de imagen: **234px × 240px** (casi cuadrado)
- CSS aplicado: `object-cover` — la imagen se recorta para llenar el contenedor
- Flujo: PNG con fondo transparente → se superpone sobre fondo degradado por sabor
- Los degradados por sabor están definidos en `data/products.ts` (ver sección 8)

---

## 2. ESPECIFICACIONES TÉCNICAS DE GENERACIÓN

| Parámetro | Valor |
|---|---|
| Plataforma | MidJourney |
| Aspect ratio | `--ar 1:1` (cuadrado) para TODAS las imágenes |
| Stylize | `--s 200` — balance entre artístico y fiel al prompt |
| Quality | `--q 2` — máxima calidad |
| Version | `--v 6.1` o la más reciente disponible |
| Formato de salida | PNG con fondo transparente (post-procesado) |
| Herramienta de remoción de fondo | remove.bg / Adobe Express / Photoshop |

> IMPORTANTE: El canvas siempre es cuadrado. Lo que cambia entre presentaciones
> es la ORIENTACIÓN DE LA BOLSA dentro del canvas, no el aspecto de la imagen.

---

## 3. TIPO DE EMPAQUE

**Flat pouch sellado transparente** — NO doypack, NO bolsa con fuelle inferior.

Características específicas:
- Bolsa plana rectangular, sellada en los cuatro bordes con sello térmico visible
- Esquinas ligeramente redondeadas
- Material: plástico transparente tipo PET/BOPP de alta claridad
- El contenido congelado (pulpa) llena la bolsa formando un bloque sólido de color
- Grosor visible: la bolsa tiene un leve relieve 3D, no es completamente plana
- Brillo natural del plástico transparente, especialmente en bordes y esquinas

---

## 4. ETIQUETA DEL EMPAQUE

- Posición: centrada en el frente de la bolsa
- Forma: rectángulo blanco con bordes ligeramente redondeados
- Fondo de la etiqueta: blanco (#FFFFFF)
- Contenido de la etiqueta (dos líneas, solo texto — sin imágenes de frutas):
  - **Línea 1** (pequeña, elegante, gris oscuro): `"Pulpa de Fruta Natural"`
  - **Línea 2** (grande, bold, en el color del sabor): nombre del sabor (ej: `"Mora"`)
- La etiqueta NO tiene ilustraciones, NO tiene logos complejos, NO tiene información nutricional visible

---

## 5. FONDO DE LA IMAGEN

**Blanco puro (#FFFFFF)** — esto es NO negociable.

La razón: el fondo blanco permite una remoción limpia y sin residuos de color.
Si se usa fondo gris, negro o de textura, los bordes del plástico transparente
quedan contaminados con ese color al hacer el recorte.

Iluminación que favorece el fondo blanco:
- Luz principal lateral (izquierda o derecha) — crea sombras que dan profundidad
- Luz de relleno suave al lado opuesto — evita zonas completamente negras
- Sombra del producto proyectada sobre el fondo blanco: suave, difusa, realista
- El plástico transparente debe tener reflejos y destellos que lo hagan brillar

---

## 6. FRUTAS COMO PROPS DE AMBIENTACIÓN

Las frutas son elementos decorativos FÍSICOS colocados alrededor del empaque.
NO van en la etiqueta. Son frutas reales, fotorrealistas, que acompañan la escena.

### Regla crítica para remoción de fondo limpia:
**Las frutas DEBEN estar tocando o solapando el empaque.**
Nunca flotando separadas en el fondo. Si están separadas, desaparecen al remover el fondo.

### Tratamiento por tipo de fruta:

| Sabor | Color pulpa interior | Props de fruta | Cantidad |
|---|---|---|---|
| **Mora** | Morado oscuro intenso (#4A0E6B) | Moras frescas enteras, algunas partidas | 5-8 unidades agrupadas |
| **Maracuyá** | Amarillo-naranja vibrante (#F59E0B) | 1 maracuyá partida a la mitad mostrando interior | 1 unidad partida |
| **Fresa** | Rojo-rosado brillante (#E11D48) | Fresas enteras con hoja verde, 1-2 partidas | 4-6 unidades |
| **Mango** | Amarillo-naranja dorado (#F97316) | 1 mango partido mostrando interior + 2-3 tajadas | 1 mitad + tajadas |
| **Guanábana** | Blanco cremoso (#F8F4E8) | 1 segmento grande con espinas exteriores visibles | 1-2 segmentos |
| **Lulo** | Verde-amarillo con semillas (#84CC16) | 2-3 lulos enteros, 1 partido a la mitad | 3-4 unidades |
| **Guayaba** | Rosa-salmón (#FB7185) | 2 guayabas enteras + 1 partida mostrando interior | 3 unidades |
| **Frutos Rojos** | Rojo oscuro mix (#9F1239) | Mix de moras, fresas pequeñas y arándanos mezclados | 6-10 unidades variadas |
| **Tomate de Árbol** | Naranja-rojo (#EA580C) | 2 tomates de árbol enteros + 1 partido | 3 unidades |

### Posición de los props según orientación:
- **120g (vertical):** frutas agrupadas en la base de la bolsa, algunas al costado
- **300g (horizontal):** frutas delante de la bolsa y en los extremos
- **1000g (horizontal):** pocas frutas, muy juntas al empaque — aspecto más institucional/serio

---

## 7. ORIENTACIONES POR PRESENTACIÓN

| Presentación | Orientación de la bolsa | Proporción visual en el canvas |
|---|---|---|
| **120g** | VERTICAL (parada, de pie) | Bolsa ocupa ~40% del ancho, centrada, espacio para frutas a costados |
| **300g** | HORIZONTAL (acostada) | Bolsa ocupa ~65% del ancho, centrada, frutas en extremos y frente |
| **1000g** | HORIZONTAL (acostada) | Bolsa ocupa ~80% del ancho, casi llena el frame, pocas frutas |

> La diferencia de tamaño entre 300g y 1000g se logra con:
> (a) proporción que ocupa en el frame
> (b) 1000g tiene menos frutas alrededor (más institucional)
> (c) el sello térmico es más visible en 1000g (bolsa más robusta)

---

## 8. PALETA DE COLORES POR SABOR (para referencia de cards web)

Estos son los gradientes ya definidos en `data/products.ts`:

| Sabor | Clase Tailwind | Hex aproximado |
|---|---|---|
| Maracuyá | `from-yellow-400 to-orange-500` | #FACC15 → #F97316 |
| Mora | `from-purple-500 to-violet-700` | #A855F7 → #6D28D9 |
| Fresa | `from-rose-400 to-red-500` | #FB7185 → #EF4444 |
| Mango | `from-amber-400 to-orange-500` | #FBBF24 → #F97316 |
| Guanábana | `from-green-400 to-emerald-600` | #4ADE80 → #059669 |
| Lulo | `from-orange-300 to-yellow-500` | #FDBA74 → #EAB308 |
| Guayaba | `from-pink-400 to-rose-500` | #F472B6 → #F43F5E |
| Frutos Rojos | `from-red-500 to-rose-700` | #EF4444 → #BE123C |
| Tomate de Árbol | `from-orange-400 to-red-500` | #FB923C → #EF4444 |

---

## 9. PLANTILLA BASE DE PROMPT — MIDJOURNEY

Usar como punto de partida para cada imagen. Reemplazar los valores entre `[ ]`.

```
Product photography, frozen fruit pulp in a transparent sealed flat pouch,
[ORIENTATION: standing vertically / lying horizontally],
[PULP COLOR] frozen pulp clearly visible through transparent plastic packaging,
white rectangular label centered on front reading "Pulpa de Fruta Natural" in small elegant gray text
and "[FLAVOR NAME]" in large bold [FLAVOR COLOR] text,
[FRUIT PROPS: e.g. "fresh blackberries scattered around the base of the bag, some halved"],
pristine white background, dramatic soft side lighting from the left,
plastic packaging with realistic reflections and subtle shine on edges,
soft diffused shadow beneath the product, professional commercial food photography,
sharp focus, hyper-realistic, high detail, studio quality,
--ar 1:1 --s 200 --q 2 --v 6.1
```

---

## 10. CATÁLOGO COMPLETO DE IMÁGENES A GENERAR

### Mora (3 imágenes)
- [ ] `SKU_Pulpa_Mora_120g.png` — vertical
- [ ] `SKU_Pulpa_Mora_300g.png` — horizontal
- [ ] `SKU_Pulpa_Mora_1000g.png` — horizontal

### Maracuyá (3 imágenes)
- [ ] `SKU_Pulpa_Maracuya_120g.png` — vertical
- [ ] `SKU_Pulpa_Maracuya_300g.png` — horizontal
- [ ] `SKU_Pulpa_Maracuya_1000g.png` — horizontal

### Fresa (3 imágenes)
- [ ] `SKU_Pulpa_Fresa_120g.png` — vertical
- [ ] `SKU_Pulpa_Fresa_300g.png` — horizontal
- [ ] `SKU_Pulpa_Fresa_1000g.png` — horizontal

### Mango (3 imágenes)
- [ ] `SKU_Pulpa_Mango_120g.png` — vertical
- [ ] `SKU_Pulpa_Mango_300g.png` — horizontal
- [ ] `SKU_Pulpa_Mango_1000g.png` — horizontal

### Guanábana (3 imágenes)
- [ ] `SKU_Pulpa_Guanabana_120g.png` — vertical
- [ ] `SKU_Pulpa_Guanabana_300g.png` — horizontal
- [ ] `SKU_Pulpa_Guanabana_1000g.png` — horizontal

### Lulo (3 imágenes)
- [ ] `SKU_Pulpa_Lulo_120g.png` — vertical
- [ ] `SKU_Pulpa_Lulo_300g.png` — horizontal
- [ ] `SKU_Pulpa_Lulo_1000g.png` — horizontal

### Guayaba (3 imágenes)
- [ ] `SKU_Pulpa_Guayaba_120g.png` — vertical
- [ ] `SKU_Pulpa_Guayaba_300g.png` — horizontal
- [ ] `SKU_Pulpa_Guayaba_1000g.png` — horizontal

### Frutos Rojos (3 imágenes)
- [ ] `SKU_Pulpa_FrutosRojos_120g.png` — vertical
- [ ] `SKU_Pulpa_FrutosRojos_300g.png` — horizontal
- [ ] `SKU_Pulpa_FrutosRojos_1000g.png` — horizontal

### Tomate de Árbol (3 imágenes)
- [ ] `SKU_Pulpa_TomateArbol_120g.png` — vertical
- [ ] `SKU_Pulpa_TomateArbol_300g.png` — horizontal
- [ ] `SKU_Pulpa_TomateArbol_1000g.png` — horizontal

---

## 11. NOMENCLATURA Y DESTINO DE ARCHIVOS

- Carpeta destino: `/public/imgs/`
- Nomenclatura: `SKU_Pulpa_[Sabor]_[Gramaje].png`
- Formato final: PNG con canal alfa (fondo transparente)
- Actualizar `data/products.ts` reemplazando las rutas actuales:
  - Antes: `image: "/imgs/fruta-mora.webp"`
  - Después: `image: "/imgs/SKU_Pulpa_Mora_120g.png"` (por cada ID de producto)

---

## 12. CHECKLIST ANTES DE SUBIR UNA IMAGEN

- [ ] Fondo removido completamente (sin halo blanco alrededor)
- [ ] Los bordes del plástico transparente están limpios
- [ ] Las frutas props que tocan el empaque sobrevivieron el recorte
- [ ] La etiqueta es legible (texto "Pulpa de Fruta Natural" + nombre del sabor)
- [ ] Guardado como PNG con canal alfa
- [ ] Nombre de archivo correcto según nomenclatura
- [ ] `data/products.ts` actualizado con la nueva ruta

---

## 13. NOTAS Y LECCIONES APRENDIDAS

*(Completar a medida que se generan imágenes)*

- MidJourney tiende a añadir demasiados elementos decorativos — usar `--no splashing liquid, --no juice pouring` si aparecen
- Para Guanábana: especificar "soursop fruit" en inglés (MidJourney entiende mejor)
- Para Lulo: especificar "lulo fruit, naranjilla, solanum quitoense" para mejor reconocimiento
- Si el plástico queda muy opaco: agregar al prompt `crystal clear transparent plastic, see-through packaging`
- Si la etiqueta tiene demasiado texto/diseño: agregar `minimal label design, clean typography only`
