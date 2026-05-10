# Lessons learned from pulpa image experiments

These notes are not the production workflow. They explain mistakes to avoid.

## Normalization is not recomposition

Scaling, centering, contrast, saturation, and canvas normalization do not change the underlying pouch structure. A square 1000g pouch remains square after normalization.

## Recomposition is not recoloring

The failed Mora experiment proved that recoloring or procedurally patching another fruit package creates artificial results. Fresa/Maracuyá patterns can guide layout and proportions, but their pixels/textures must not be reused to create Mora.

## PIL/ImageMagick are not enough for final premium generation

Local image processing is useful for measuring, trimming, normalizing, and exporting approved images. It is not enough to create photoreal product packaging from scratch.

## Approved pattern vs reference image

An approved pattern is a set of structural parameters and visual rules. A reference image is evidence of the pattern. Do not confuse the reference image with editable source material.

## Mora failed proof summary

- Normalized Mora kept original defects.
- Procedural Mora fixed proportions but looked artificial.
- Correct workflow is new generation/design from the target fruit profile using approved pattern specs.

## Same presentation must use locked geometry

The Mora 120g and Mango 120g tests proved that repeating the same soft presentation wording is not enough. Image generators may change pouch width, label scale, seal thickness, fruit footprint, and canvas occupancy based on the fruit. The workflow now requires one approved canonical reference per presentation and a strict structural lock: for the same presentation, only pulp color, fruit garnish type, and flavor text may change.

## Vertical family decision

The Mango 120g test showed that the vertical pouch reads cleaner as a product family direction, but it also exposed failures: the product was oversized, used a designed dark background, and incorrectly included `1000g` on a 120g pack. The presentation system now uses vertical pouches for 120g, 300g, and 1000g, differentiated by controlled width, fullness, label text, and canvas occupancy instead of switching to horizontal packs.

## 120g must be narrower and cleaner

The Mora120 and Fresa120 tests improved the label shape and general vertical family look, but the 120g presentation still read too large and too wide. The 120g pattern now needs a narrower visual aspect, smaller canvas occupancy, more generous margins, compact fruit garnish, and cleaner heat-seal plastic. The top seal should remain thin, translucent, and lightly visible — not ribbed, striped, cloudy, dirty, thick, or visually dominant.

## Avoid fully frontal packaging and generated weight text

The vertical pouch should not be a perfectly frontal mugshot. A very subtle 1 degree rotation toward the viewer's left gives enough depth when the right side edge is slightly visible, without losing label readability or becoming a dramatic 3/4 view. Weight text should not be generated inside the image because image models have already shown they can hallucinate or swap weights across presentations. Keep only `Pulpa de Fruta Natural` and the flavor name on the generated label; handle weights outside the image or in a later controlled design step if legally/visually required.

## Proportions require measurable boxes, not prompt adjectives

The Guayaba 120g, 300g, and 1000g test proved that prompts using words like `narrow`, `medium`, `large`, or percentage height are not enough when each presentation is generated independently. The model may produce 120g and 300g at nearly the same visual scale, or make 1000g smaller than 300g. The workflow now requires normalized 1000x1000 bounding-box targets and a three-pack proportion lineup before batch generation. If the generated image misses the target box, reject/regenerate; do not normalize a structurally wrong scale.

## Checkerboard is not transparency

Some generators render a gray checkerboard pattern to simulate transparency. That is a baked background, not alpha. Reject checkerboard outputs unless the checkerboard is only the viewer UI and not part of the exported pixels.
