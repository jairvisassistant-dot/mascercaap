# Rejection rules

Reject immediately if any rule fails.

## Conceptual failures

- Recolored package from another flavor.
- Wrong fruit or ambiguous fruit identity.
- Wrong presentation shape.
- Pouch does not match the approved presentation pattern.
- Pouch geometry changes across flavors for the same presentation.
- Reference image is copied as pixels instead of used only as structural guidance.
- Relative presentation scale is wrong: 120g is visually similar to 300g, 300g is similar to 1000g, or 1000g appears smaller than 300g.
- Output fails the target normalized 1000x1000 bounding-box ranges for its presentation.
- Stand-up zipper pouch, doypack, gusseted bottom bag, or resealable retail pouch generated instead of flat frozen pulp sachet.
- Horizontal pillow pack generated when the vertical family pattern is required.

## Visual failures

- Advertisement, poster, flyer, social card, Canva template, grid of options, headline layout, or marketing composition instead of one isolated product asset.
- Flat vector/cartoon/procedural-looking pouch.
- Floating or pasted label.
- Fruit cutout remnants, rectangular artifacts, or packaging fragments.
- Harsh, dirty, corrugated, or dominant side seals.
- Ribbed, striped, cloudy, dirty, thick, or dominant top seal plastic on 120g.
- Empty bag, sagging front, hollow volume, or excessive trapped air.
- Over-inflated, balloon-like, swollen pillow, or exaggerated bulky pouch shape.
- Perfectly flat frontal mugshot when the pattern asks for 1 degree left rotation with the right side slightly visible.
- Strong 3/4 perspective, excessive rotation, or left side dominant perspective.
- Dramatic black hero background or scene instead of transparent/plain isolated product asset.
- Rendered checkerboard transparency grid, fake transparent pattern, or baked background grid.
- Artificial pulp color that does not match the fruit.
- Fruit garnish dominates or hides the pouch/label.
- Product touches or is cropped by the canvas.
- Product is oversized and fills the canvas beyond the target presentation occupancy.
- 120g pouch is too wide, too square, or visually similar in width to 300g.
- 1000g pouch is not clearly wider and more massive than 300g.
- Non-transparent or designed background when a cutout/packshot was requested.

## Process failures

- Image was normalized before structural approval.
- Image was approved by comparing only to its original, not to the pattern.
- Prompt requested "make this look like another fruit" or equivalent.
- Generated output ignores label requirements.
- Generated label includes weight text such as 120g, 300g, 1000g, grams, net weight, numbers, badges, claims, or extra copy.
