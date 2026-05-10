---
name: pulpa-image-generation
description: >
  Generates and audits uniform premium catalog images for Mas Cerca AP fruit pulp packages.
  Trigger: when creating, retouching, normalizing, auditing, or prompting images for pulpa products in 120g, 300g, or 1000g presentations.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Creating new product images for fruit pulps.
- Auditing whether existing pulp images are usable.
- Generating prompts for image tools such as GPT-Images, Photoshop generative fill, Firefly, Midjourney, or equivalent.
- Normalizing final approved images to the project catalog format.
- Deciding whether an image can be retouched or must be regenerated from scratch.

## Critical Rules

1. **Do not recolor one fruit into another.** Never convert Fresa into Mora, Mango into Lulo, etc.
2. **Use approved patterns, not source pixels.** Derive structure from approved patterns; do not use reference images as editable material unless explicitly approved.
3. **If no approved pattern exists, create the pattern first.** Do not generate the full catalog before approving one canonical image per presentation.
4. **Generate from the correct fruit and presentation from the start.** The prompt must name the actual fruit, pulp color, fruits, pouch size, and label.
5. **Normalize only after the image is structurally approved.** Canvas/scale/color cannot fix bad packaging architecture.
6. **Reject artificial outputs.** Flat vector pouches, floating labels, fake seals, bad recuts, recolored pulp, and pasted fruit are not acceptable.
7. **Generate product assets, not ads.** The output must be one isolated product packshot/cutout, never a poster, flyer, social card, mockup grid, Canva template, typography composition, or marketing layout.
8. **Enforce proportions with measurements, not adjectives.** 120g, 300g, and 1000g must follow the normalized 1000x1000 bounding-box targets in `presentation-specs.json`. If the output misses those ranges, reject/regenerate instead of trying to fix scale after the fact.

## Execution Contract

This skill is not a passive note list. It must run as an operating workflow with an explicit mode, required inputs, required resources, and a concrete output.

Before producing any answer, determine the requested mode:

| Mode | User asks for | Required output |
|---|---|---|
| `prompt-generation` | prompts/briefs for a fruit and presentation(s) | Final prompts assembled from specs, fruit profile, template, QA constraints, and rejection rules |
| `canonical-pattern` | first approved image/pattern for a presentation | One canonical prompt for the target presentation plus approval criteria |
| `image-audit` | review generated/received images | Pass/fail audit against QA checklist and rejection rules, with concrete fixes |
| `normalization-decision` | resize/export/normalize images | Decision: normalize technically or regenerate/recompose first |
| `retouch-brief` | fix an existing image | Retouch brief only if structure is valid; otherwise reject and regenerate |

If the requested mode is unclear, ask one clarifying question and stop.

## Mandatory Resource Loading by Mode

The workflow must load and use these resources, not merely mention them:

| Mode | Must load |
|---|---|
| `prompt-generation` | `assets/presentation-specs.json`, `assets/prompt-templates.md`, `assets/fruit-profiles.json`, `assets/rejection-rules.md`, `assets/qa-checklist.md` |
| `canonical-pattern` | `assets/presentation-specs.json`, `assets/prompt-templates.md`, `assets/rejection-rules.md`, `assets/qa-checklist.md`, `references/lessons-learned.md` |
| `image-audit` | `assets/presentation-specs.json`, `assets/fruit-profiles.json`, `assets/qa-checklist.md`, `assets/rejection-rules.md`, `references/lessons-learned.md` |
| `normalization-decision` | `assets/presentation-specs.json`, `assets/qa-checklist.md`, `assets/rejection-rules.md`, `references/lessons-learned.md` |
| `retouch-brief` | `assets/presentation-specs.json`, `assets/fruit-profiles.json`, `assets/qa-checklist.md`, `assets/rejection-rules.md` |

When generating prompts, QA and rejection rules must be converted into prompt constraints and negative prompt terms. When auditing images, QA and rejection rules must be applied as pass/fail checks. They are not optional background context.

## Prompt Generation Algorithm

For `prompt-generation`, execute this exact sequence:

1. Identify fruit key and target presentation(s): `120g`, `300g`, `1000g`, or all three.
2. Load the fruit profile and extract:
   - `spanishName`
   - `labelText`
   - `pulpColor`
   - `fruitGarnish`
   - `avoid`
3. Load presentation specs and extract global rules plus each target presentation's:
   - orientation and pouch character
   - camera angle/depth rule
   - target group fill
   - safe margins
   - expected aspect
   - label rules
   - seal rules
   - fruit placement
4. Load prompt templates and assemble:
   - shared prompt block;
   - canonical reference lock when approved presentation references exist or are expected;
   - target presentation block;
   - negative prompt.
5. Inject fruit-specific avoid terms into the negative prompt.
6. Enforce label text policy:
   - allowed: `Pulpa de Fruta Natural` and `{labelText}` only;
   - forbidden: weight text, numbers, claims, badges, slogans, extra copy.
7. Enforce output contract:
   - one isolated packshot/cutout;
   - transparent background or plain white fallback;
   - no ad/poster/layout/mockup/background scene.
8. Enforce proportion discipline:
   - include normalized 1000x1000 bounding-box targets in each presentation prompt;
   - explain that text prompts alone cannot guarantee proportions when presentations are generated independently;
   - require canonical references or a three-pack proportion lineup for calibration.
9. Return prompts grouped by presentation, plus a common negative prompt.

Do not skip QA/rejection resources just because the user asked only for prompts. In prompt-generation mode, those resources prevent known failures before image creation.

## Image Audit Algorithm

For `image-audit`, execute this exact sequence:

1. Identify target fruit and presentation.
2. Compare the image against fruit profile: pulp color, garnish, forbidden substitutions.
3. Compare against presentation specs: orientation, scale, aspect, seal quality, label placement, camera angle, fruit placement.
4. Measure or estimate the normalized bounding box against the target pixel ranges in `presentation-specs.json`.
5. Apply rejection rules first. If any rejection rule fails, return `REJECT` with reasons.
6. Apply QA checklist. Return:
   - `APPROVE` only if all mandatory criteria pass;
   - `RETOUCH` only if structure is valid and defects are local/minor;
   - `REGENERATE` if pouch geometry, fruit identity, label integration, or presentation pattern fails.
7. Never recommend normalization until structural approval passes.

## Canonical Pattern Policy

Every presentation must have one approved canonical pattern before batch generation:

- `120g`: slim narrow vertical pouch, smallest family member.
- `300g`: medium vertical pouch, wider/fuller than 120g.
- `1000g`: large vertical-wide institutional pouch, wider/more robust than 300g.

The canonical reference is used only for structure: silhouette, camera angle, label placement, seal placement, fruit footprint, canvas occupancy, and optical centering. It must not be used for pixels, fruit, pulp color, texture, label text, lighting artifacts, shadows, background, or defects.

Before generating flavor variants, approve a three-pack proportion lineup that shows 120g, 300g, and 1000g together. This lineup is not a final catalog asset; it is a scale calibration artifact. The relative visual mass must be:

- `120g`: compact individual sachet;
- `300g`: clearly wider/fuller than 120g;
- `1000g`: clearly wider/more massive than 300g.

For the same presentation, only these elements may change across flavors:

- pulp color;
- fruit garnish type;
- flavor text.

Everything else must remain structurally consistent.

## Required Workflow

1. Determine execution mode from the user's request.
2. Load all mandatory resources for that mode.
3. If generating a specific fruit, load `assets/fruit-profiles.json` and inject fruit profile values into the prompt or audit.
4. If generating or auditing a presentation, load `assets/presentation-specs.json` and apply the target presentation rules.
5. Load `assets/qa-checklist.md` and `assets/rejection-rules.md` before approving, rejecting, retouching, normalizing, or generating final prompts.
6. Determine whether approved patterns already exist for the target presentation:
   - If yes: use the pattern parameters.
   - If no: create and approve a canonical pattern first.
7. Generate or request a new image from scratch using the prompt template.
8. Audit the result against QA and rejection rules.
9. Only after approval, normalize/export to `1000x1000px` transparent PNG and then web formats.

## Output Requirements by Mode

### `prompt-generation`

Return:

1. prompt per requested presentation;
2. common negative prompt;
3. short execution note explaining that approved canonical references must be supplied for each presentation when using image-to-image;
4. no image approval claim, because no image has been audited yet.

### `canonical-pattern`

Return:

1. one prompt for the canonical presentation;
2. approval checklist specific to that presentation;
3. rejection conditions;
4. next step: generate sample, then run `image-audit`.

### `image-audit`

Return:

1. verdict: `APPROVE`, `RETOUCH`, `REGENERATE`, or `REJECT`;
2. evidence-based reasons;
3. exact fixes or regeneration instructions;
4. whether normalization is allowed.

### `normalization-decision`

Return:

1. whether technical normalization is allowed;
2. reason based on structural approval;
3. target export requirements.

### `retouch-brief`

Return:

1. retouch scope;
2. forbidden edits;
3. preserve-structure constraints;
4. fallback to regeneration if structure fails.

## Provider Handling

Some tools, especially Canva-style generators, interpret "catalog image" as an advertisement layout. For those tools, use the strict asset prompt from `assets/prompt-templates.md` and explicitly request:

- a single isolated product packshot;
- no background design;
- no poster/card/flyer;
- no marketing headline;
- no layout;
- no extra text outside the product label.

## Pattern Decision Tree

| Situation | Action |
|---|---|
| Existing image has correct structure and only size/canvas varies | Normalize technically |
| Existing image has wrong pouch shape, bad seal, floating label, or empty bag | Regenerate/recompose from pattern |
| Fruit does not match the product | Regenerate from scratch |
| Image appears recolored from another fruit | Reject |
| Presentation pattern is missing | Build canonical pattern first |

## Resources

- **Presentation specs**: `assets/presentation-specs.json`
- **Fruit profiles**: `assets/fruit-profiles.json`
- **Prompt templates**: `assets/prompt-templates.md`
- **QA checklist**: `assets/qa-checklist.md`
- **Rejection rules**: `assets/rejection-rules.md`
- **Lessons learned**: `references/lessons-learned.md`

## Notes

This skill does not require a specific image-generation provider. If a tool such as GPT-Images is available, use the prompts and QA rules from this skill. If no image-generation tool is available, do not fake photoreal assets procedurally; produce the prompt/brief and stop for user execution.
