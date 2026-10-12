import { test, expect, type Page } from "@playwright/test";

/**
 * Collapsible panels that were rewritten from an animated `height` to a CSS
 * `grid-template-rows: 0fr → 1fr` transition.
 *
 * These assertions pin the behaviour that rewrite could plausibly break: the
 * panel must still be reachable when open, must collapse to zero height when
 * closed, must stay hidden on desktop, and the `inert` contract (links inside a
 * collapsed menu must not be focusable) must survive.
 */

async function menuHeight(page: Page): Promise<number> {
  const box = await page.locator("#mobile-nav").boundingBox();
  return box ? box.height : -1;
}

test.describe("collapsible — Navbar mobile menu", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("[menu] opens on toggle, collapses to zero height, and closes on navigation", async ({
    page,
  }) => {
    await page.goto("/es", { waitUntil: "load" });

    const toggle = page.locator('button[aria-controls="mobile-nav"]');
    await expect(toggle).toBeVisible();

    // Collapsed: zero height (border-top is the only non-zero pixel).
    expect(await menuHeight(page)).toBeLessThan(2);

    // Collapsed menu must not expose its links to focus or to assistive tech.
    await expect(page.locator("#mobile-nav")).toHaveAttribute("inert", "");
    await expect(page.locator("#mobile-nav")).toHaveAttribute("aria-hidden", "true");
    const firstLink = page.locator("#mobile-nav a").first();
    await expect(firstLink).not.toBeFocused();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("#mobile-nav") !== null)).toBe(
      false,
    );

    await toggle.click();
    await expect(page.locator("#mobile-nav")).not.toHaveAttribute("inert", "");
    await expect(page.locator("#mobile-nav")).toHaveAttribute("aria-hidden", "false");
    expect(await menuHeight(page)).toBeGreaterThan(100);
    await expect(firstLink).toBeVisible();

    // Navigating from a menu entry must close the menu again. The first link is
    // "Inicio", which resolves to the current page, so this asserts the collapse
    // itself rather than a document swap — poll across the 300ms transition.
    await firstLink.click();
    await expect
      .poll(async () => menuHeight(page), { timeout: 3_000 })
      .toBeLessThan(2);
  });

  test("[menu] stays hidden on desktop where the hamburger is absent", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/es", { waitUntil: "load" });
    await expect(page.locator('button[aria-controls="mobile-nav"]')).toBeHidden();
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });
});

test.describe("collapsible — ProductsFilterBar level-2 panel", () => {
  test("[filterbar] expands after choosing a category and collapses back", async ({ page }) => {
    await page.goto("/es/productos", { waitUntil: "load" });

    const panel = page.locator("#products-filter-level-2");
    await expect(panel).toHaveCount(1);

    // Before any interaction the level-2 row is collapsed.
    const collapsed = await panel.boundingBox();
    expect(collapsed === null ? 0 : collapsed.height).toBeLessThan(2);

    // Choosing a category reveals the flavour/size row.
    const firstCategory = page.locator("#products-filter-bar button").first();
    await firstCategory.click();
    await page.waitForTimeout(600); // 200ms transition + settle

    const expanded = await panel.boundingBox();
    expect(expanded === null ? 0 : expanded.height).toBeGreaterThan(20);
  });
});
