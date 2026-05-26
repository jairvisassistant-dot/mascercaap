---
name: pulpa-catalog-image-consistency
description: >
  Genera imagenes de pulpas de fruta para catalogo (120g, 300g, 1000g) con
  tamanos fijos y estilo uniforme usando GPT-Image-2. Trigger: cuando el
  usuario pida crear imagenes de pulpas manteniendo proporciones
  y estilo consistente entre presentaciones y sabores.
---

# Pulpa Catalog Image Consistency

Skills: image-generation, catalog, consistency

## Version rapida (3 pasos)

```
1. Elegir sabor + presentacion -> cargar `assets/fruit-profiles.json`
2. Elegir bounded box -> tabla abajo
3. Ensamblar prompt -> copiar a GPT-Image-2 -> obtener imagen
```

## Bounded boxes definitivos

Todas las imagenes se generan para canvas final `1000x1000` con alpha real.
Estos son los tamanos FIJOS, no varian por sabor. Solo cambia el sabor.

| Presentacion | Pouch (ancho x alto) | Grupo completo (ancho x alto) | Ocupacion del canvas |
|---|---|---|---|
| **120g** | 324-340 x 756-768 | 660-700 x 754-770 | 66-70% ancho, 75-77% alto |
| **300g** | 406-430 x 796-812 | 775-808 x 792-810 | 77-81% ancho, 79-81% alto |
| **1000g** | 440-470 x 796-812 | 820-855 x 792-810 | 82-86% ancho, 79-81% alto |

Reglas de altura entre presentaciones:
- **120g** < **300g** (120g es claramente mas baja)
- **300g** y **1000g** comparten practicamente la misma altura visible
- **1000g** crece sobre todo en ancho y robustez, no en altura

## Referencia visual (FRESA)

Usa `public/imgs/pulpa-fresa120.webp`, `pulpa-fresa300.webp` y `pulpa-fresa1000.webp`
para calibrar proporcion relativa entre presentaciones. No copies pixeles de otro sabor.

## Pasos para generar UNA imagen

### Paso 1: Identificar sabor

Cargar `assets/fruit-profiles.json`. Extraer:

| Campo | Value |
|---|---|
| `spanishName` | Nombre en espanol, ej: "Mora" |
| `labelText` | Texto de etiqueta, ej: "MORA" |
| `pulpColor` | Descripcion del color de pulpa |
| `fruitGarnish` | Fruta de soporte |
| `avoid` | Terminos a evitar |

### Paso 2: Elegir presentacion

De la tabla de bounded boxes de arriba. Si tenes imagen de referencia del sabor
(120g, 300g o 1000g), usala para calibrar color, textura de pulpa, fruta y
nivel real de detalle. Si la referencia se ve mas simple o mas suave, no
sobrerenderices semillas, brillos, volumen ni textura.
Si no tenes referencia, pedila antes de generar.

### Paso 3: Usar el prompt general

Este prompt funciona para CUALQUIER sabor y presentacion. Solo cambia 3 cosas:
- `{SABOR}` — ej: Mora, Mango, Guayaba (en espanol, con mayuscula)
- `{COLOR PULPA}` — ej: deep blackberry purple, rich mango orange-yellow, pink guava pulp
- `{FRUTA}` — ej: fresh blackberries, fresh mango and diced mango cheek, whole and sliced guava

```text
Create ONE isolated photorealistic premium product packshot on 1024x1024 square canvas.
Product: frozen fruit pulp in a transparent flexible flat vertical pouch, heat-sealed, naturally full but not inflated.
Flavor: {SABOR}.
Pulp: {COLOR PULPA}, natural frozen consistency.

Size discipline for a 1000x1000 final canvas — pick the correct presentation:

If 120g:
- pouch-only: 324-340px wide x 756-768px tall
- full group: 660-700px wide x 754-770px tall
- target occupancy: 66-70% width, 75-77% height
- 120g is the smallest, visibly shorter than 300g and 1000g
- keep it compact and narrow
- reduce height slightly while keeping the same width family

If 300g:
- pouch-only: 406-430px wide x 796-812px tall
- full group: 775-808px wide x 792-810px tall
- target occupancy: 77-81% width, 79-81% height
- 300g is visibly taller than 120g
- 300g and 1000g share nearly the same visible total height

If 1000g:
- pouch-only: 440-470px wide x 796-812px tall
- full group: 820-855px wide x 792-810px tall
- target occupancy: 82-86% width, 79-81% height
- 1000g is the widest and most robust, but NOT taller than 300g
- grows mainly in width, not in height

Seal quality: minimize visible residual plastic. Top seal must be thin, refined, and premium with no broad transparent flap. Aggressively reduce the visible leftover plastic from the top seal so it reads as a clean, compact closure, while still looking natural and believable. Side seals must never look bulky, cloudy, or ragged.
Camera angle: rotate the product slightly toward the viewer's left so the right edge/seam is slightly more visible than the left. NOT frontal, NOT dramatic.
Label: cream label integrated into the pouch, readable, with only "Pulpa de Fruta Natural" and the flavor name. No weight text, no extra copy.
Fruit garnish: {FRUTA}, placed at the lower base, realistic and natural. Same composition pattern as the reference image. Any cut fruit must preserve freshness and realism: natural moisture, believable interior texture, and a fresh-cut look without becoming glossy, artificial, or exaggerated.
Lighting: soft commercial studio lighting.
Background: transparent. If not supported, pure white fallback. No green, magenta, blue, chroma-key, or checkerboard.
Reference fidelity: match the reference image not only in flavor identity, but also in realism level. If the reference pulp looks smoother and less seed-dominant, keep that simpler texture. Do not over-emphasize seeds, gloss, micro-texture, fruit volume, or premium polish beyond the reference.
```

Al final del prompt, agregar esto SIEMPRE:

```text
IMPORTANT: Single isolated product asset only. NOT an ad, poster, social card, or layout. No headline, frame, logo, or text outside the label. Real transparent background or pure white fallback only. Never use green, magenta, blue, checkerboard, studio scenery, or chroma-key.

Negative: No doypack, zipper pouch, bottle, jar, carton, horizontal pouch. No weight text. No fake checkerboard. No perfectly flat frontal view. No inverted angle (right edge must be more visible than left). No excess plastic on seals.
```

### Paso 4: Generar con GPT-Image-2

1. Copiar el prompt completo a GPT-Image-2
2. Verificar que la salida sea un asset aislado (no poster/anuncio/layout)
3. Si la transparencia no funciona en el primer intento:
   - Un solo fallback con fondo blanco puro
   - No insistas mas de una vez
4. Guardar como: `pulpa-{sabor}{gramaje}.webp`
   - Ej: `pulpa-mora120.webp`, `pulpa-mango300.webp`, `pulpa-guayaba1000.webp`
5. Canvas final ideal: 1000x1000 con alpha real

## QA rapido (checklist visual)

Despues de generar, verificar estos puntos. Si falla ALGUNO, regenerar:

- [ ] Es un pouch vertical, no doypack, no horizontal, no zipper
- [ ] La etiqueta dice solo "Pulpa de Fruta Natural" + sabor (sin gramaje)
- [ ] El costado derecho del pouch se ve un poco mas que el izquierdo
- [ ] No es frontal, no es dramatico
- [ ] Sellados finos y limpios (especialmente el superior, con una reduccion agresiva del residuo plastico visible)
- [ ] El color de pulpa del pouch y la fruta partida son de la misma familia del sabor
- [ ] El nivel de textura, semillas visibles, brillo y detalle del pouch se parece a la referencia; no esta sobrerenderizado
- [ ] La fruta de soporte es la correcta para el sabor
- [ ] La fruta se ve natural, no plastica ni con color artificial
- [ ] La fruta partida conserva la misma lectura general de la referencia; no gana volumen, brillo o detalle exagerado
- [ ] Las frutas cortadas se ven frescas y naturales: interior jugoso o humedo cuando aplique, textura creible y sensacion de fruta recien abierta o recien cortada, sin verse plasticas
- [ ] Fondo transparente (o blanco puro como fallback)
- [ ] La escala visible coincide con la presentacion (120g < 300g ≈ 1000g en alto)
- [ ] No es un anuncio, poster ni layout de diseno
- [ ] Si se compara contra la referencia del sabor, la salida se siente de la misma familia visual y no una reinterpretacion mas lujosa o mas detallada

Si la imagen pasa todo: listo.
Si falla solo por canvas/alpha/fondo blanco: se puede normalizar (ver abajo).
Si falla por sabor, escala, angulo, sellos o estructura: regenerar.

## Normalizacion post-generacion (opcional)

Si la imagen es visualmente correcta pero el canvas no es 1000x1000 o el fondo
es blanco en vez de transparente, usa los scripts:

```bash
# Si la imagen viene en 1024x1024 (GPT-Image-2 nativo)
python3 scripts/normalize_catalog_webp.py entrada.png salida.webp 120g --fit-final-canvas

# Si el fondo es blanco puro
python3 scripts/normalize_catalog_webp.py entrada.webp salida.webp 300g --remove-white-background --fit-final-canvas

# Si el grupo visible es demasiado grande para su presentacion
python3 scripts/normalize_catalog_webp.py entrada.webp salida.webp 1000g --fit-presentation-bbox

# Auditoria tecnica final
python3 scripts/audit_catalog_asset.py salida.webp 120g --flavor mora --stage final
```

Dependencias: `pip install Pillow`.

## Template-first mode (para casos dificiles)

Si despues de 2 intentos la imagen sigue fallando por:
- angulo frontal o invertido
- plastico residual en el sellado superior
- color de pulpa inconsistente

Usa `template-first mode`:
1. Pedi al usuario un master aprobado del gramaje (pouch sin fruta, fondo transparente)
2. Usa ese master como plantilla de geometria (angulo, sellos, proporcion)
3. Genera solo variando el sabor (color de pulpa, fruta, texto de etiqueta)

## Referencia de valores por presentacion

### 120g
| Atributo | Valor |
|---|---|
| pouchWidthPx | 324-340 |
| pouchHeightPx | 756-768 |
| fullGroupWidthPx | 660-700 |
| fullGroupHeightPx | 754-770 |
| targetGroupFillWidthPercent | 66-70 |
| targetGroupFillHeightPercent | 75-77 |
| fruitZonePercentFromBottom | 12-16 |
| Pouch character | Slim narrow vertical, mas pequeno del catalogo |

### 300g
| Atributo | Valor |
|---|---|
| pouchWidthPx | 406-430 |
| pouchHeightPx | 796-812 |
| fullGroupWidthPx | 775-808 |
| fullGroupHeightPx | 792-810 |
| targetGroupFillWidthPercent | 77-81 |
| targetGroupFillHeightPercent | 79-81 |
| fruitZonePercentFromBottom | 18-22 |
| Pouch character | Medium vertical, mas ancho que 120g |
| Height family | 300g-1000g (misma altura visible) |

### 1000g
| Atributo | Valor |
|---|---|
| pouchWidthPx | 440-470 |
| pouchHeightPx | 796-812 |
| fullGroupWidthPx | 820-855 |
| fullGroupHeightPx | 792-810 |
| targetGroupFillWidthPercent | 82-86 |
| targetGroupFillHeightPercent | 79-81 |
| fruitZonePercentFromBottom | 16-20 |
| Pouch character | Large vertical-wide, mas robusto que 300g |
| Height family | 300g-1000g (misma altura visible, crece en ancho) |

## Recursos de la skill

| Archivo | Que contiene |
|---|---|
| `assets/presentation-specs.json` | Spec completo con bounded boxes, pesos, politicas |
| `assets/fruit-profiles.json` | Perfil de cada sabor (color, fruta, texto de etiqueta) |
| `assets/prompt-templates.md` | Templates completos de prompt (si necesitas mas detalle) |
| `assets/qa-checklist.md` | Checklist QA detallado gate por gate |
| `scripts/normalize_catalog_webp.py` | Normalizacion tecnica a 1000x1000 |
| `scripts/audit_catalog_asset.py` | Auditoria tecnica automatizada |
| `references/fresa-approved-baseline.md` | Mediciones del baseline FRESA |
| `references/template-first-mode.md` | Instrucciones detalladas de template-first mode |
