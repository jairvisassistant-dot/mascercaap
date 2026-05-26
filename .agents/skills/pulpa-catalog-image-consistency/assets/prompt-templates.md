# Prompt Templates

## Bloque obligatorio de salida

```text
IMPORTANT: Generate a single isolated product asset only. This is NOT an ad, NOT a poster, NOT a social post, NOT a design layout. No headline, no frame, no logo, no extra text outside the label. Use real transparent background. If transparency is not supported, use plain pure white background only. Never use green, magenta, blue, checkerboard, studio scenery, floor, shadow background, or chroma-key background.
```

## Regla de angulo, explicada sin ambiguedad

```text
Rotate the product itself slightly toward the viewer's left. The correct result is that the right pouch edge/seam becomes a little more visible than the left. If the left edge becomes more visible, the angle is wrong.
```

## Prompt base (para cualquier sabor)

```text
Create ONE isolated photorealistic premium product packshot on a square generation canvas valid for the image provider. For gpt-image-2 explicit generation, use 1024x1024 composition discipline; final catalog delivery will be normalized to 1000x1000.
Product: frozen fruit pulp in a transparent flexible flat vertical pouch, heat-sealed, naturally full but not inflated.
Flavor: {FLAVOR_NAME}.
Pulp: preserve the same color, consistency, density, and visual texture from the provided reference image.
Color fidelity: match the reference hue family exactly. Keep the pouch pulp and cut fruit flesh in the same flavor color family shown by the reference. Do not shift the pulp or the garnish toward a different fruit family, an artificial neon version, or an oversaturated commercial exaggeration.
Reference fidelity: match the reference not only in flavor identity but also in realism level. If the reference looks smoother, simpler, less glossy, or less seed-dominant, preserve that restraint. Do not over-emphasize seeds, frozen granularity, gloss, fruit volume, or premium polish beyond what the reference already shows.
Size discipline: do not inherit final scale from the flavor reference if it is smaller or larger than the approved FRESA master of the same presentation. Match the final visible size, canvas occupancy, and overall group silhouette of the FRESA master presentation instead.
Iteration discipline: do not improvise alternative layouts. If transparency is not available, keep the same composition and switch only to pure white background so the candidate can be normalized without another creative rewrite.
Seal quality: minimize visible residual plastic on the sealed edges. The top seal must be especially clean, thin, refined, and premium, with no broad transparent flap above the pouch, no zipper-like cap, no milky plastic crown, and no extra white residual sheet extending above the pouch body. Aggressively reduce the visible leftover plastic from the top seal so it reads as a compact, clean closure while still looking natural and believable. Side seals must never look bulky, cloudy, ragged, or visually dominant.
Camera angle: the pouch must not look frontal. Rotate the product itself slightly toward the viewer's left so the right edge/seam is clearly a little more visible than the left in the final thumbnail. Keep the label fully readable, but do not let the pouch flatten into a straight-on view.
Label: cream label integrated into pouch perspective, readable, with only:
- "Pulpa de Fruta Natural"
- "{LABEL_TEXT}"
No grams or extra copy.
Fruit garnish: keep the same fruit composition layout pattern as the reference flavor image, scaled proportionally for the target presentation.
Lighting: soft commercial studio lighting, same direction and style as reference.
Camera: premium catalog packshot with subtle but visible depth; never perfectly flat frontal and never dramatic perspective.
Background: transparent. If transparent output is not available, use pure white only.
```

## Bloque de identidad del sabor

Completar este bloque desde `assets/fruit-profiles.json` y la imagen de referencia antes de generar. No inventar una identidad nueva del sabor.

```text
Flavor identity from reference:
- Pulp color: {PULP_COLOR_DESCRIPTION}   (usar fruit-profiles.json: pulpColor)
- Pulp consistency: {PULP_TEXTURE_DESCRIPTION}   (describir desde referencia)
- Whole fruit: {WHOLE_FRUIT_DESCRIPTION}   (usar fruit-profiles.json: fruitGarnish)
- Cut fruit: {CUT_FRUIT_DESCRIPTION}   (describir desde referencia)
- Seeds/flesh details: {SEED_AND_FLESH_DESCRIPTION}   (describir desde referencia)
- Leaves/garnish: {LEAF_AND_GARNISH_DESCRIPTION}   (usar fruit-profiles.json: fruitGarnish)

Fruit realism requirements:
- fruit must look photographic and natural, not plastic or candy-like
- cut fruit flesh must preserve realistic hue, moisture, translucency, and seed placement from reference
- the pouch pulp and the cut fruit flesh must stay in the same color family as defined by the reference flavor (fruit-profiles.json: pulpColor); they must not drift apart in hue
- the garnish should preserve the same simplicity level as the reference; do not add extra glamour, extra gloss, exaggerated moisture, or oversized cut-fruit drama
- any cut fruit must preserve freshness and realism: believable interior texture, natural moisture when applicable, and a fresh-cut appearance without looking fake, lacquered, waxy, or over-stylized
- avoid artificial oversaturation, flat interiors, repeated seed patterns, waxy texture, or generic fruit slices
```

## Bloque de presentacion

### 120g

```text
Target presentation: 120g vertical.
Respect these bounds on a 1000x1000 canvas:
- match the approved FRESA 120g master visual size
- pouch-only width: 324-340px
- pouch-only height: 756-768px
- full group width (pouch + fruits): 660-700px
- full group height (pouch + fruits): 754-770px
- target visible group occupancy: 66-70% width and 75-77% height
- if the flavor reference is smaller than FRESA 120g, enlarge to the FRESA 120g master size
- for 120g, keep the group visibly shorter than 300g and 1000g, but anchored to the normalized FRESA 120g reference rather than an arbitrary smaller guess
- reduce height slightly versus the previous 120g template while keeping the same width family
```

### 300g

```text
Target presentation: 300g vertical.
Respect these bounds on a 1000x1000 canvas:
- match the approved FRESA 300g master visual size
- pouch-only width: 406-430px
- pouch-only height: 796-812px
- full group width (pouch + fruits): 775-808px
- full group height (pouch + fruits): 792-810px
- target visible group occupancy: 77-81% width and 79-81% height
- 300g must be visibly taller than 120g
- 300g and 1000g must share nearly the same visible total height
```

### 1000g

```text
Target presentation: 1000g vertical.
Respect these bounds on a 1000x1000 canvas:
- match the approved FRESA 1000g master visual size
- pouch-only width: 440-470px
- pouch-only height: 796-812px
- full group width (pouch + fruits): 820-855px
- full group height (pouch + fruits): 792-810px
- target visible group occupancy: 82-86% width and 79-81% height
- 1000g must be visibly taller than 120g
- 1000g must be wider and more robust than 300g, but not visibly taller
```

## Negative prompt comun

```text
Do not create ads, social cards, templates, posters, scenes, extra typography, or logos.
Do not use doypack, zipper pouch, bottle, jar, carton, rigid container, or horizontal pouch.
Do not change flavor identity.
Do not alter pulp color away from reference.
Do not shift the pouch pulp or cut fruit flesh toward orange, neon coral, washed-out salmon, or candy red.
Do not make the result look more premium, sharper, glossier, seed-heavier, or more dramatic than the reference image.
Do not inherit a smaller visible product size from the flavor reference when FRESA master is larger.
Do not move fruit arrangement to a different composition style.
Do not add weight text (120g/300g/1000g) on label.
Do not render fake checkerboard transparency.
Do not use green, magenta, blue, or chroma-key background.
Do not leave excess residual plastic on the seals, especially at the top seal.
Do not leave a thick white plastic crown, a broad flap, or visibly messy leftover plastic above the top seal.
Do not make the pouch perfectly flat frontal.
Do not let the top of the pouch read as a second plastic layer, zipper strip, or broad white cap.
Do not let the cut fruit look dry, waxy, plastic, stale, or unnaturally glossy.
Do not invert the angle: the right edge must be slightly more visible than the left, never the opposite.
```

## Normalizacion obligatoria

```text
Final delivery is not the raw generator output. Normalize every approved image:
- ensure true transparent background alpha;
- fit a valid provider canvas such as 1024x1024 into final 1000x1000 when needed;
- convert to `.webp`;
- strip metadata when possible;
- compress to catalog-friendly size without obvious quality loss.
If the raw image still contains pure white background, it must go through white-background-removal normalization before approval.
If the raw image contains checkerboard, green, magenta, blue, scenery, floor, or any non-white background, reject and regenerate.
Do not keep regenerating a visually correct candidate just to chase transparency if a pure-white fallback can be normalized.
```

## Bloque de puerta de referencia

Si no hay imagen de referencia, no generar. Pedir:

```text
Compárteme una imagen de referencia del sabor (120g, 300g o 1000g) para iniciar.
```
