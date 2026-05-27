#!/usr/bin/env python3
"""
Phase 1 – React Doctor quick wins
  1. w-N h-N  → size-N   (design-no-redundant-size-axes,    160 issues)
  2. px-N py-N → p-N      (design-no-redundant-padding-axes,  32 issues)

Handles plain and responsive-prefix variants (e.g. md:w-10 md:h-10 → md:size-10).
Operates only on same-line pairs; will not touch pairs split across lines.
"""

import re
import sys
from pathlib import Path

BASE    = Path("/home/jilz/Escritorio/mas-cerca-ap")
DRY_RUN = "--dry" in sys.argv

# ── Regex helpers ──────────────────────────────────────────────────────────────

NUM = r'\d+(?:\.\d+)?'                          # plain number: 4, 1.5
ARB = r'\[[\w./#%:-]+\]'                        # arbitrary: [40px], [2rem]
VAL = rf'(?:{NUM}|{ARB})'                       # number OR arbitrary value
PRE = r'(?:[\w-]+:)*'                           # optional prefix: md:, hover:focus:, …

def _size_pattern(prefix_group: str) -> re.Pattern:
    """
    Matches (prefix)w-N (prefix)h-N where both prefix and N are identical.
    Uses a named group so the backreference is reliable.
    """
    return re.compile(
        rf'({prefix_group}w-({VAL}))[ \t]+(?P<pfx>\3)h-(?P=val)',
        re.VERBOSE,
    )

# Simpler approach: compile two patterns and apply in order

# Pattern A: prefixed w-N h-N  (md:w-10 md:h-10 → md:size-10)
#   group 1 = full prefix (e.g. "md:")
#   group 2 = value (e.g. "10")
SIZE_PRE = re.compile(
    rf'((?:[\w-]+:)+)w-({VAL})[ \t]+\1h-\2'
)
# Pattern B: bare w-N h-N  (w-10 h-10 → size-10)
SIZE_BARE = re.compile(
    rf'(?<![:\w])w-({VAL})[ \t]+h-\1(?![\w-])'
)
# Pattern C: prefixed h-N w-N  (md:h-10 md:w-10 → md:size-10)
SIZE_PRE_REV = re.compile(
    rf'((?:[\w-]+:)+)h-({VAL})[ \t]+\1w-\2'
)
# Pattern D: bare h-N w-N  (h-10 w-10 → size-10)
SIZE_BARE_REV = re.compile(
    rf'(?<![:\w])h-({VAL})[ \t]+w-\1(?![\w-])'
)

# px-N py-N → p-N  (and reverse)
PAD_XY = re.compile(rf'(?<![:\w])px-({VAL})[ \t]+py-\1(?![\w-])')
PAD_YX = re.compile(rf'(?<![:\w])py-({VAL})[ \t]+px-\1(?![\w-])')

# Prefixed padding: md:px-4 md:py-4 → md:p-4
PAD_XY_PRE = re.compile(rf'((?:[\w-]+:)+)px-({VAL})[ \t]+\1py-\2')
PAD_YX_PRE = re.compile(rf'((?:[\w-]+:)+)py-({VAL})[ \t]+\1px-\2')


def fix_size_axes(content: str) -> str:
    # w-N h-N order
    content = SIZE_PRE.sub(r'\1size-\2', content)
    content = SIZE_BARE.sub(r'size-\1', content)
    # h-N w-N order (reverse — also flagged by the same rule)
    content = SIZE_PRE_REV.sub(r'\1size-\2', content)
    content = SIZE_BARE_REV.sub(r'size-\1', content)
    return content

def fix_padding_axes(content: str) -> str:
    content = PAD_XY_PRE.sub(r'\1p-\2', content)
    content = PAD_YX_PRE.sub(r'\1p-\2', content)
    content = PAD_XY.sub(r'p-\1', content)
    content = PAD_YX.sub(r'p-\1', content)
    return content


# ── File lists ─────────────────────────────────────────────────────────────────

SIZE_FILES = [
    "app/[lang]/contacto/loading.tsx",
    "app/(admin)/admin/configuracion/seguridad/page.tsx",
    "components/layout/Footer.tsx",
    "app/(admin)/admin/faq/components/FAQQuestionItem.tsx",
    "app/[lang]/productos/ProductsHero.tsx",
    "components/sections/NosotrosPageContent.tsx",
    "components/ui/AnimatedWhatsAppButton.tsx",
    "components/ui/HelpDrawer.tsx",
    "app/(admin)/admin/productos/ProductosAdminClient.tsx",
    "components/layout/Navbar.tsx",
    "app/(admin)/admin/lineas/LineasList.tsx",
    "app/[lang]/politicas/page.tsx",
    "components/sections/FeaturedProducts.tsx",
    "app/(admin)/admin/login/page.tsx",
    "app/[lang]/productos/ProductsFilterBar.tsx",
    "components/sections/ProductCategories.tsx",
    "app/[lang]/productos/loading.tsx",
    "app/(admin)/admin/categorias/CategoriasList.tsx",
    "app/(admin)/admin/imagenes/ImagenesAdminClient.tsx",
    "app/[lang]/productos/WhatsAppCTABanner.tsx",
    "app/[lang]/page.tsx",
    "app/[lang]/productos/ProductsClosingCTA.tsx",
    "app/[lang]/terminos/page.tsx",
    "app/(admin)/admin/productos/ProductoForm.tsx",
    "app/[lang]/productos/ProductsSearchInput.tsx",
    "components/admin/AdminNavbar.tsx",
    "components/sections/ContactForm.tsx",
    "components/sections/ContactoPageContent.tsx",
    "components/sections/HowToBuy.tsx",
    "components/sections/WhyChooseUs.tsx",
    "components/sections/MisionVisionTabs.tsx",
    "app/(admin)/admin/faq/components/FAQCategoryCard.tsx",
    "components/ui/ThemeToggle.tsx",
    "components/ui/ProductLightbox.tsx",
    "components/ui/ProductCard.tsx",
    "components/ui/HelpHub.tsx",
    "components/ui/ProductGridCard.tsx",
    "components/ui/drawer-views/FaqView.tsx",
    "components/ui/LanguageSwitcher.tsx",
    "components/ui/ProductLineRow.tsx",
    "components/ui/TestimonialMarquee.tsx",
    "components/ui/drawer-views/OrderAssistantView.tsx",
    "components/ui/drawer-views/HelpMenu.tsx",
    "components/ui/drawer-views/WhatsAppConnectView.tsx",
    "components/ui/PulpaFruitGrid.tsx",
]

PADDING_FILES = [
    "app/(admin)/admin/faq/components/CategoryEditForm.tsx",
    "app/(admin)/admin/faq/components/ConfigSection.tsx",
    "app/(admin)/admin/faq/components/NewCategoryForm.tsx",
    "app/(admin)/admin/productos/ProductosAdminClient.tsx",
    "components/layout/Navbar.tsx",
    "app/(admin)/admin/lineas/LineasList.tsx",
    "app/(admin)/admin/categorias/CategoriasList.tsx",
    "app/(admin)/admin/faq/components/ConfirmDeleteBox.tsx",
    "app/(admin)/admin/faq/components/NewQuestionForm.tsx",
    "app/(admin)/admin/productos/ProductoForm.tsx",
    "components/admin/AdminNavbar.tsx",
    "app/(admin)/admin/faq/components/QuestionEditForm.tsx",
    "components/sections/YieldCalculator.tsx",
    "components/ui/drawer-views/LegalView.tsx",
    "components/ui/drawer-views/FaqView.tsx",
    "components/ui/drawer-views/ContactView.tsx",
    "components/ui/drawer-views/WhatsAppConnectView.tsx",
    "components/ui/PulpaFruitGrid.tsx",
]

# ── Processing ─────────────────────────────────────────────────────────────────

size_set    = set(SIZE_FILES)
padding_set = set(PADDING_FILES)
all_files   = sorted(size_set | padding_set)

total_changed = 0
total_lines   = 0

for rel in all_files:
    path = BASE / rel
    if not path.exists():
        print(f"  SKIP (missing): {rel}")
        continue

    original = path.read_text(encoding="utf-8")
    content  = original

    if rel in size_set:
        content = fix_size_axes(content)
    if rel in padding_set:
        content = fix_padding_axes(content)

    if content != original:
        orig_lines    = original.splitlines()
        new_lines     = content.splitlines()
        changed_lines = sum(1 for a, b in zip(orig_lines, new_lines) if a != b)
        total_changed += 1
        total_lines   += changed_lines
        tag = "[DRY] " if DRY_RUN else ""
        print(f"  {tag}✓ {rel}  ({changed_lines} lines changed)")
        if not DRY_RUN:
            path.write_text(content, encoding="utf-8")
    else:
        if "--verbose" in sys.argv:
            print(f"  — no change: {rel}")

print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}Files changed: {total_changed}  |  Lines changed: {total_lines}")
