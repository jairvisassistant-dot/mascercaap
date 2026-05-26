#!/usr/bin/env python3
"""
Technical audit for pulp catalog assets.

This script is intentionally narrow: it validates measurable constraints only.
It does not approve visual quality, fruit realism, label quality, or camera angle.

Usage:
  python3 audit_catalog_asset.py public/imgs/pulpa-guayaba120.webp 120g --flavor guayaba --stage final
  python3 audit_catalog_asset.py /tmp/raw-guayaba1000.png 1000g --stage raw
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from PIL import Image


SKILL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SPECS_PATH = SKILL_DIR / "assets" / "presentation-specs.json"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Audit measurable catalog asset constraints.")
    parser.add_argument("image", type=Path, help="Image file to audit")
    parser.add_argument("presentation", choices=["120g", "300g", "1000g"])
    parser.add_argument("--flavor", help="Flavor slug for final filename validation, e.g. guayaba")
    parser.add_argument("--stage", choices=["raw", "final"], default="final")
    parser.add_argument(
        "--allow-opaque-background",
        action="store_true",
        help="Allow raw pure-white fallback candidates to be audited before background removal",
    )
    parser.add_argument("--specs", type=Path, default=DEFAULT_SPECS_PATH)
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    return parser


def load_specs(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def has_alpha(image: Image.Image) -> bool:
    return image.mode in {"RGBA", "LA"} or "transparency" in image.info


def alpha_extrema(image: Image.Image) -> tuple[int, int]:
    alpha = image.convert("RGBA").getchannel("A")
    return alpha.getextrema()


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.convert("RGBA").getchannel("A").getbbox()


def check_between(value: int, bounds: list[int], label: str, failures: list[str]) -> None:
    low, high = bounds
    if not low <= value <= high:
        failures.append(f"{label} out of range: expected {low}-{high}, got {value}")


def scaled_bounds(bounds: list[int], source_size: tuple[int, int], final_canvas: tuple[int, int]) -> list[int]:
    """Scale final 1000px bbox bounds to a raw generation canvas."""
    scale_x = source_size[0] / final_canvas[0]
    scale_y = source_size[1] / final_canvas[1]
    scale = (scale_x + scale_y) / 2
    return [round(bounds[0] * scale), round(bounds[1] * scale)]


def allowed_canvas_sizes(specs: dict[str, Any], stage: str) -> list[tuple[int, int]]:
    final_canvas = specs["global"]["canvas"]
    sizes = [(final_canvas["width"], final_canvas["height"])]

    if stage == "raw":
        generation_canvas = specs["global"].get("generationCanvas")
        if generation_canvas:
            sizes.append((generation_canvas["width"], generation_canvas["height"]))

    return list(dict.fromkeys(sizes))


def raw_canvas_is_normalizable(image_size: tuple[int, int], final_canvas: tuple[int, int]) -> bool:
    """Allow native square outputs from the built-in generator when they can be fit down safely."""
    width, height = image_size
    return width == height and width >= final_canvas[0] and height >= final_canvas[1]


def expected_filename(flavor: str, presentation: str) -> str:
    grams = presentation.removesuffix("g")
    return f"pulpa-{flavor}{grams}.webp"


def audit(args: argparse.Namespace) -> dict[str, Any]:
    specs = load_specs(args.specs)
    global_specs = specs["global"]
    presentation_specs = specs["presentations"][args.presentation]
    canvas = tuple(global_specs["canvas"][key] for key in ("width", "height"))
    allowed_canvases = allowed_canvas_sizes(specs, args.stage)
    failures: list[str] = []
    skipped_checks: list[str] = []

    if not args.image.exists():
        failures.append(f"file does not exist: {args.image}")
        return {"ok": False, "failures": failures}

    image = Image.open(args.image)
    image_alpha = has_alpha(image)
    min_alpha, max_alpha = alpha_extrema(image)
    has_real_alpha = image_alpha and min_alpha < 255 and max_alpha > 0
    allow_opaque_raw = args.stage == "raw" and args.allow_opaque_background
    bbox = alpha_bbox(image) if has_real_alpha else None

    canvas_ok = image.size in allowed_canvases
    if not canvas_ok and args.stage == "raw":
        canvas_ok = raw_canvas_is_normalizable(image.size, canvas)

    if not canvas_ok:
        expected = " or ".join(f"{width}x{height}" for width, height in allowed_canvases)
        failures.append(f"canvas mismatch: expected {expected}, got {image.size[0]}x{image.size[1]}")

    if not image_alpha and not allow_opaque_raw:
        failures.append("missing alpha channel")
    if min_alpha >= 255 and not allow_opaque_raw:
        failures.append("missing real transparent background")
    if max_alpha <= 0:
        failures.append("image is fully transparent")
    if bbox is None and not allow_opaque_raw:
        failures.append("empty alpha bounding box")
    if bbox is None and allow_opaque_raw:
        skipped_checks.append("alpha bounding box skipped for opaque raw fallback")

    bbox_size = None
    if bbox is not None:
        bbox_width = bbox[2] - bbox[0]
        bbox_height = bbox[3] - bbox[1]
        bbox_size = [bbox_width, bbox_height]
        width_bounds = presentation_specs["fullGroupWidthPx"]
        height_bounds = presentation_specs["fullGroupHeightPx"]
        if args.stage == "raw" and image.size != canvas:
            width_bounds = scaled_bounds(width_bounds, image.size, canvas)
            height_bounds = scaled_bounds(height_bounds, image.size, canvas)
        check_between(bbox_width, width_bounds, "full group width", failures)
        check_between(bbox_height, height_bounds, "full group height", failures)

    if args.stage == "final":
        if args.image.suffix.lower() != ".webp":
            failures.append(f"final extension must be .webp, got {args.image.suffix}")

        max_size = global_specs["exportPolicy"]["maxFileSizeKB"][args.presentation] * 1024
        size_bytes = args.image.stat().st_size
        if size_bytes > max_size:
            failures.append(
                f"file too large: expected <= {max_size / 1024:.0f} KB, got {size_bytes / 1024:.1f} KB"
            )

        if args.flavor:
            flavor = re.sub(r"[^a-z0-9-]+", "-", args.flavor.lower()).strip("-")
            expected = expected_filename(flavor, args.presentation)
            if args.image.name != expected:
                failures.append(f"filename mismatch: expected {expected}, got {args.image.name}")

    return {
        "ok": not failures,
        "stage": args.stage,
        "image": str(args.image),
        "presentation": args.presentation,
        "canvas": list(image.size),
        "expected_canvas": list(canvas),
        "allowed_canvas": [list(size) for size in allowed_canvases],
        "has_alpha": image_alpha,
        "alpha_extrema": [min_alpha, max_alpha],
        "bbox": list(bbox) if bbox else None,
        "bbox_size": bbox_size,
        "size_kb": round(args.image.stat().st_size / 1024, 1),
        "skipped_checks": skipped_checks,
        "failures": failures,
    }


def main() -> int:
    args = build_parser().parse_args()
    result = audit(args)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"ok={result['ok']}")
        print(f"stage={result.get('stage')}")
        print(f"image={result.get('image')}")
        print(f"presentation={result.get('presentation')}")
        print(f"canvas={result.get('canvas')}")
        print(f"expected_canvas={result.get('expected_canvas')}")
        print(f"allowed_canvas={result.get('allowed_canvas')}")
        print(f"has_alpha={result.get('has_alpha')}")
        print(f"alpha_extrema={result.get('alpha_extrema')}")
        print(f"bbox={result.get('bbox')}")
        print(f"bbox_size={result.get('bbox_size')}")
        print(f"size_kb={result.get('size_kb')}")
        for skipped in result.get("skipped_checks", []):
            print(f"skipped={skipped}")
        for failure in result["failures"]:
            print(f"failure={failure}")

    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
