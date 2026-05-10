# Prompt templates for pulpa image generation

Use these prompts to generate **new images from scratch**. Do not ask the image tool to recolor another flavor. Replace variables wrapped in `{}`.

## Output contract — mandatory

Every prompt must produce a **single isolated product asset**, not a design composition.

```text
Output must be ONE isolated product packshot/cutout only, centered on a real transparent background. If transparency is not supported, use plain white background only. Do not render a gray checkerboard transparency pattern as part of the image. Do not create an advertisement, poster, flyer, social media card, Canva template, mockup, grid, scene, headline design, typography layout, frame, border, badge, logo, or marketing composition. No extra text outside the product label.
```

## Shared prompt block

```text
Create ONE isolated photorealistic premium product packshot/cutout on a normalized 1000x1000 canvas of a vertical flat pillow-style frozen fruit pulp sachet made of transparent flexible plastic, filled with {pulpColor}. The product is Colombian frozen fruit pulp, flavor {spanishName}. The package is a soft heat-sealed frozen pulp sachet, not a stand-up zipper pouch, not a doypack, not a jar, not a bottle, not a carton, not a horizontal pillow pack, and not a retail bag with gusseted bottom. The pouch must look naturally full but not inflated, not swollen, not bulky, not exaggerated, and not like an oversized cushion. Keep a flatter readable center plane for the label with soft realistic pressure near the edges. Rotate the fruit pulp package very slightly, about 1 degree toward the viewer's left. The right side of the package must be a little more visible to create subtle depth and avoid a totally frontal view, while the label remains fully readable. Do not use a dramatic 3/4 angle. Use natural soft studio lighting, subtle highlights, and real transparent background. If transparency is not supported, use plain white background only. Do not render or bake a gray checkerboard transparency pattern into the image. Add clean realistic {fruitGarnish} as supporting garnish at the lower base. The pouch has a cream paper label integrated into the plastic surface, with only the text "Pulpa de Fruta Natural" and the flavor name "{labelText}" clearly readable in deep purple. Do not generate weight text such as 120g, 300g, 1000g, grams, net weight, numbers, badges, or any extra label copy. The label follows the pouch perspective and material; it is not floating or pasted on top. Keep the composition premium and balanced as an isolated product asset.

Do not create an advertisement, poster, flyer, social media card, Canva template, mockup, product grid, typography layout, headline design, border, frame, badge, logo, background scene, or marketing composition. No extra text outside the product label.
```

## Canonical reference lock — mandatory for Option B

Use this block when an approved reference image exists for the target presentation. It must be included before the presentation-specific block.

```text
Use the approved {presentation} reference image ONLY as a structural guide. Match the reference image's pouch silhouette, vertical orientation, camera angle, seal placement, label position, label scale, fruit garnish footprint, canvas occupancy, and optical centering. Do NOT copy pixels, pulp color, fruit type, fruit texture, label text, background, shadows, artifacts, defects, or lighting mistakes from the reference image.

For this {presentation} presentation, the pouch geometry must remain identical across all flavors. Only these elements may change: pulp color, fruit garnish type, and flavor text. Do not change pouch proportions, label size, label position, seal thickness, corner rounding, camera angle, product scale, or fruit footprint. Keep the same 1 degree left rotation with the right side edge slightly visible.

Respect the approved presentation scale from the three-pack proportion lineup. Do not infer scale independently. The generated image must fit the exact normalized 1000x1000 bounding-box targets for this presentation.
```

## 120g prompt

```text
{sharedPrompt}

{canonicalReferenceLock}

Presentation: 120g individual frozen pulp sachet. Use the exact approved 120g vertical canonical layout. The pouch is slim, narrow, vertical, flat, heat-sealed, and rotated only about 1 degree toward the viewer's left, with the right side of the pouch slightly more visible for depth. It must be visibly narrower than the 300g and 1000g presentations while keeping the same elegant label shape. On a normalized 1000x1000 canvas, target these measurable bounds: pouch-only width 260-310px, pouch-only height 540-600px, full product group width including fruit 380-450px, full product group height 600-650px. The full product group must occupy only about 60 to 64 percent of the square canvas height, leaving generous safe margins of about 14 to 18 percent. The visible group aspect must feel clearly narrow and vertical, about 0.42 to 0.52 width-to-height. Do not make the product oversized. Reduce the apparent package width; do not create a broad rectangular bag. Use a clean thin translucent top heat seal and soft clean side seals: the sealing plastic must be lightly visible, refined, and realistic, not ribbed, not striped, not cloudy, not dirty, not thick, and not a dominant white cap. Do not use a zipper, resealable closure, gusseted bottom, stand-up pouch, horizontal pillow pack, or rigid retail bag. The pouch must be full but not inflated, with no exaggerated bulging. Fruit garnish must stay compact and limited to the lower 12 to 15 percent of the canvas, lower left and lower right, balancing the pouch without covering the label or increasing the perceived package width. Use the approved 120g pattern: compact narrow vertical, clean, elegant, no dominant white top cap, no square block shape. Do not place "120g" or any weight text on the label.
```

## 300g prompt

```text
{sharedPrompt}

{canonicalReferenceLock}

Presentation: 300g frozen pulp sachet. Use the exact approved 300g vertical canonical layout. The pouch is medium, vertical, flat, heat-sealed, visibly wider and fuller than 120g, and rotated only about 1 degree toward the viewer's left, with the right side of the pouch slightly more visible for depth. On a normalized 1000x1000 canvas, target these measurable bounds: pouch-only width 390-450px, pouch-only height 660-730px, full product group width including fruit 560-640px, full product group height 730-800px. The full product group must occupy only about 78 to 82 percent of the square canvas height, leaving comfortable safe margins. The visible group aspect must stay vertical, about 0.72 to 0.88 width-to-height. Do not make the product oversized. It must be visibly full with natural tension, not sagging, not empty, not over-inflated, not bloated, and not shaped like a huge swollen pillow. Do not use a zipper, resealable closure, gusseted bottom, stand-up pouch, horizontal pillow pack, or rigid retail bag. Top and side seals must be visible but softened and premium, not harsh or corrugated. Fruit garnish sits at lower left and lower right as support and must stay limited to the lower 18 to 22 percent of the canvas. Use the approved 300g pattern: commercial vertical pouch, centered label, controlled wrinkles, clean premium packaging. Do not place "300g" or any weight text on the label.
```

## 1000g prompt

```text
{sharedPrompt}

{canonicalReferenceLock}

Presentation: 1000g institutional frozen pulp sachet. Use the exact approved 1000g vertical canonical layout. The pouch is large, vertical-wide, flat, heat-sealed, wider and more robust than the 300g version, and rotated only about 1 degree toward the viewer's left, with the right side of the pouch slightly more visible for depth, a full stable front, and refined side seals. On a normalized 1000x1000 canvas, target these measurable bounds: pouch-only width 510-590px, pouch-only height 740-820px, full product group width including fruit 680-780px, full product group height 820-880px. The full product group must occupy only about 82 to 86 percent of the square canvas height, leaving safe margins. The visible group aspect must stay vertical-wide, about 0.82 to 0.98 width-to-height. Do not make the product oversized and do not crop it. Do not use a zipper, resealable closure, gusseted bottom, stand-up pouch, horizontal pillow pack, or rigid retail bag. The pouch must feel premium and institutional, but not inflated, not balloon-like, and not excessively bulging. The front plane should be broad and calm with fewer wrinkles than 300g. Fruit garnish is minimal and controlled at the lower corners, limited to the lower 16 to 20 percent of the canvas. Use the approved 1000g pattern: large vertical institutional pack, dominant pouch, centered readable label, refined commercial finish. Do not place "1000g" or any weight text on the label.
```

## Negative prompt

```text
Do not recolor another fruit package. Do not make the pouch look like a flat vector illustration. Do not use a floating label. Do not create pasted fruit, bad cutouts, rectangular crop remnants, fake shadows, dirty plastic, excessive wrinkles, empty bag sagging, harsh white side seals, cloudy thick plastic borders, ribbed top cap, striped seal band, dirty seal plastic, generic fruit, wrong fruit, wrong pulp color, opaque bottle, jar, box, carton, glass, bowl, stand-up zipper pouch, doypack, gusseted bottom bag, resealable zipper closure, retail pouch, horizontal pillow pack, checkerboard transparency background, gray checkerboard pattern, fake transparent grid, or background scene. Do not create an over-inflated pouch, balloon shape, swollen pillow shape, massive bulging package, oversized product that fills the entire canvas, too-wide 120g pouch, broad rectangular 120g bag, 120g scaled like 300g, 1000g scaled smaller than 300g, inconsistent relative presentation scale, perfectly flat frontal mugshot, strong 3/4 perspective, excessive rotation, left side dominant perspective, or dramatic black hero background. Do not crop the product. Do not let fruit dominate the pouch. Do not change the approved presentation geometry across flavors. Do not use text other than "Pulpa de Fruta Natural" and "{labelText}". Do not generate 120g, 300g, 1000g, grams, net weight, numbers, badges, claims, slogans, or extra label copy. Do not create an advertisement, poster, flyer, social card, Canva template, product grid, headline, slogan, border, frame, badge, logo, layout, or any extra typography.
```

## Canva-specific strict prompt prefix

Use this prefix when generating in Canva or any tool that tends to create marketing layouts:

```text
IMPORTANT: Generate a single isolated product PNG-style asset only. This is NOT a Canva flyer, NOT a social media post, NOT an advertisement, NOT a product poster, and NOT a card design. No headline, no frame, no border, no brand logo, no background scene, no text outside the product label. Center one product pouch with fruit garnish on transparent background or plain white background.
```

## Image-to-image guidance

If the image tool supports references:

1. Provide approved pattern references only for composition.
2. Explicitly say: "Use the reference only for layout/proportion, not for pixels, texture, fruit, or color."
3. Provide the target fruit profile as the actual content.
4. If the tool cannot obey this separation, do not use image-to-image; use text-to-image and QA manually.
