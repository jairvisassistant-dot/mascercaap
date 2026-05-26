#!/usr/bin/env python3
"""
Normalize catalog product images to optimized WEBP outputs.

Usage:
  python3 normalize_catalog_webp.py input.png output.webp 120g
  python3 normalize_catalog_webp.py input.png output.webp 300g --min-quality 70 --max-quality 84

By default, this script fails closed when the source does not already match the
catalog contract. Use explicit flags for the two sanctioned technical fixes:
--fit-final-canvas for provider-canvas normalization, and
--remove-white-background for pure-white fallback background removal.
"""

from __future__ import annotations

import argparse
from collections import deque
import io
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


SKILL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SPECS_PATH = SKILL_DIR / "assets" / "presentation-specs.json"
PRESENTATIONS = ("120g", "300g", "1000g")
IDEAL_QUALITY_RANGE = (72, 82)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Normalize catalog image into optimized WEBP.")
    parser.add_argument("input", type=Path, help="Source image path")
    parser.add_argument("output", type=Path, help="Destination WEBP path")
    parser.add_argument("presentation", choices=sorted(PRESENTATIONS), help="120g, 300g, or 1000g")
    parser.add_argument("--min-quality", type=int, default=IDEAL_QUALITY_RANGE[0])
    parser.add_argument("--max-quality", type=int, default=IDEAL_QUALITY_RANGE[1])
    parser.add_argument(
        "--fit-final-canvas",
        action="store_true",
        help="Fit a valid raw generation canvas into the final 1000x1000 catalog canvas",
    )
    parser.add_argument(
        "--remove-white-background",
        action="store_true",
        help="Remove an edge-connected pure-white fallback background before export",
    )
    parser.add_argument(
        "--fit-presentation-bbox",
        action="store_true",
        help="Scale the isolated visible group to fit the target bbox range for the presentation",
    )
    parser.add_argument(
        "--white-threshold",
        type=int,
        default=248,
        help="Minimum RGB channel value treated as fallback white background",
    )
    parser.add_argument("--specs", type=Path, default=DEFAULT_SPECS_PATH)
    return parser


def load_specs(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def encode_webp_bytes(image: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    image.save(
        buffer,
        format="WEBP",
        quality=quality,
        method=6,
        lossless=False,
        exact=True,
    )
    return buffer.getvalue()


def image_has_alpha(image: Image.Image) -> bool:
    if image.mode in {"RGBA", "LA"}:
        return True
    return "transparency" in image.info


def image_has_real_transparency(image: Image.Image) -> bool:
    if not image_has_alpha(image):
        return False
    alpha = image.convert("RGBA").getchannel("A")
    min_alpha, max_alpha = alpha.getextrema()
    return min_alpha < 255 and max_alpha > 0


def is_near_white(pixel: tuple[int, int, int, int], threshold: int) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and red >= threshold and green >= threshold and blue >= threshold


def remove_edge_connected_white(image: Image.Image, threshold: int) -> Image.Image:
    """Remove only white pixels connected to the canvas border.

    This keeps cream labels, white seals, and highlights inside the product when
    they are not connected to the fallback background.
    """

    source = image.convert("RGBA")
    width, height = source.size
    pixels = source.load()
    visited = bytearray(width * height)
    background = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def index(x: int, y: int) -> int:
        return y * width + x

    def push_if_background(x: int, y: int) -> None:
        idx = index(x, y)
        if visited[idx]:
            return
        visited[idx] = 1
        if is_near_white(pixels[x, y], threshold):
            background[idx] = 1
            queue.append((x, y))

    for x in range(width):
        push_if_background(x, 0)
        push_if_background(x, height - 1)
    for y in range(height):
        push_if_background(0, y)
        push_if_background(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                push_if_background(nx, ny)

    output = source.copy()
    out_pixels = output.load()
    removed = 0
    for y in range(height):
        for x in range(width):
            if background[index(x, y)]:
                red, green, blue, _alpha = out_pixels[x, y]
                out_pixels[x, y] = (red, green, blue, 0)
                removed += 1

    if removed == 0:
        raise RuntimeError("White background removal failed: no edge-connected white background found.")

    return output


def fit_to_final_canvas(image: Image.Image, expected_canvas: tuple[int, int]) -> Image.Image:
    source = image.convert("RGBA")
    if source.size == expected_canvas:
        return source

    if source.size[0] == source.size[1] and expected_canvas[0] == expected_canvas[1]:
        return source.resize(expected_canvas, Image.Resampling.LANCZOS)

    contained = ImageOps.contain(source, expected_canvas, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", expected_canvas, (255, 255, 255, 0))
    left = (expected_canvas[0] - contained.size[0]) // 2
    top = (expected_canvas[1] - contained.size[1]) // 2
    canvas.alpha_composite(contained, (left, top))
    return canvas


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.convert("RGBA").getchannel("A").getbbox()


def fit_visible_group_to_presentation_bbox(
    image: Image.Image,
    *,
    presentation_specs: dict[str, Any],
    expected_canvas: tuple[int, int],
) -> Image.Image:
    source = image.convert("RGBA")
    bbox = alpha_bbox(source)
    if bbox is None:
        raise RuntimeError("Visible-group fitting failed: image has empty alpha bounding box.")

    crop = source.crop(bbox)
    bbox_width = bbox[2] - bbox[0]
    bbox_height = bbox[3] - bbox[1]
    if bbox_width <= 0 or bbox_height <= 0:
        raise RuntimeError("Visible-group fitting failed: invalid alpha bounding box.")

    width_bounds = presentation_specs["fullGroupWidthPx"]
    height_bounds = presentation_specs["fullGroupHeightPx"]
    width_scale_bounds = (
        width_bounds[0] / bbox_width,
        width_bounds[1] / bbox_width,
    )
    height_scale_bounds = (
        height_bounds[0] / bbox_height,
        height_bounds[1] / bbox_height,
    )
    overlap_low = max(width_scale_bounds[0], height_scale_bounds[0])
    overlap_high = min(width_scale_bounds[1], height_scale_bounds[1])

    if overlap_low <= overlap_high:
        scale = (overlap_low + overlap_high) / 2
    else:
        target_width = round((width_bounds[0] + width_bounds[1]) / 2)
        target_height = round((height_bounds[0] + height_bounds[1]) / 2)
        scale = min(target_width / bbox_width, target_height / bbox_height)

    if scale <= 0:
        raise RuntimeError("Visible-group fitting failed: non-positive scale.")

    resized = crop.resize(
        (
            max(1, round(crop.size[0] * scale)),
            max(1, round(crop.size[1] * scale)),
        ),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", expected_canvas, (255, 255, 255, 0))
    left = (expected_canvas[0] - resized.size[0]) // 2
    top = (expected_canvas[1] - resized.size[1]) // 2
    canvas.alpha_composite(resized, (left, top))
    return canvas


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    specs = load_specs(args.specs)
    canvas_specs = specs["global"]["canvas"]
    export_policy = specs["global"]["exportPolicy"]
    presentation_specs = specs["presentations"][args.presentation]

    if not 0 <= args.white_threshold <= 255:
        raise RuntimeError("--white-threshold must be between 0 and 255.")

    original = Image.open(args.input)
    expected_canvas = (canvas_specs["width"], canvas_specs["height"])

    source = original.convert("RGBA")
    if args.remove_white_background:
        source = remove_edge_connected_white(source, args.white_threshold)

    if source.size != expected_canvas:
        if not args.fit_final_canvas:
            raise RuntimeError(
                "Final asset rejected: "
                f"canvas must be {expected_canvas[0]}x{expected_canvas[1]}, got {source.size[0]}x{source.size[1]}. "
                "Use --fit-final-canvas for controlled provider-canvas normalization."
            )
        source = fit_to_final_canvas(source, expected_canvas)

    if args.fit_presentation_bbox:
        source = fit_visible_group_to_presentation_bbox(
            source,
            presentation_specs=presentation_specs,
            expected_canvas=expected_canvas,
        )

    if source.size != expected_canvas:
        raise RuntimeError(
            "Final asset rejected: "
            f"canvas must be {expected_canvas[0]}x{expected_canvas[1]}, got {source.size[0]}x{source.size[1]}."
        )

    has_alpha = image_has_alpha(source)
    has_real_transparency = image_has_real_transparency(source)
    if not has_alpha:
        raise RuntimeError("Final asset rejected: source image has no alpha channel.")
    if not has_real_transparency:
        raise RuntimeError("Final asset rejected: source image has no real transparent background.")

    args.output.parent.mkdir(parents=True, exist_ok=True)

    max_size = export_policy["maxFileSizeKB"][args.presentation] * 1024
    best_bytes: bytes | None = None
    best_quality: int | None = None

    for quality in range(args.max_quality, args.min_quality - 1, -1):
        encoded = encode_webp_bytes(source, quality)
        if len(encoded) <= max_size:
            best_bytes = encoded
            best_quality = quality
            break
        if best_bytes is None or len(encoded) < len(best_bytes):
            best_bytes = encoded
            best_quality = quality

    if best_bytes is None or best_quality is None:
        raise RuntimeError("WEBP normalization failed: no candidate output was produced.")

    args.output.write_bytes(best_bytes)

    print(f"input={args.input}")
    print(f"output={args.output}")
    print(f"presentation={args.presentation}")
    print(f"fit_final_canvas={args.fit_final_canvas}")
    print(f"fit_presentation_bbox={args.fit_presentation_bbox}")
    print(f"remove_white_background={args.remove_white_background}")
    print(f"quality={best_quality}")
    print(f"size_kb={len(best_bytes) / 1024:.1f}")
    print(f"source_alpha={has_alpha}")
    print(f"source_real_transparency={has_real_transparency}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
