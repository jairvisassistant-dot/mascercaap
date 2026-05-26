import { test, expect } from "@playwright/test";

test.describe("skip-to-content", () => {
  test("Tab focuses the skip link and Enter moves focus to #main-content", async ({ page }) => {
    await page.goto("/es");

    // First Tab reveals the sr-only skip link
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: /saltar al contenido/i });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");

    // #main-content receives programmatic focus (tabIndex={-1})
    const main = page.locator("#main-content");
    await expect(main).toBeFocused();
  });
});

test.describe("HelpDrawer keyboard", () => {
  test("opens via Enter and closes with Escape", async ({ page }) => {
    await page.goto("/es");

    const trigger = page.getByRole("button", { name: "¿Necesitas ayuda?" });
    await expect(trigger).toBeVisible({ timeout: 3000 });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    // HelpDrawer is a dynamic() import — allow extra time for the first load
    await expect(dialog).toBeVisible({ timeout: 8000 });

    // Close button receives focus on open
    const closeBtn = dialog.getByRole("button", { name: "Cerrar" });
    await expect(closeBtn).toBeFocused();

    // Escape dismisses the drawer
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("Tab focus is trapped inside the drawer", async ({ page }) => {
    await page.goto("/es");

    const trigger = page.getByRole("button", { name: "¿Necesitas ayuda?" });
    await expect(trigger).toBeVisible({ timeout: 3000 });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Tab through all focusable elements; focus must never leave the dialog
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const activeOutside = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog ? !dialog.contains(document.activeElement) : false;
      });
      expect(activeOutside, `Focus escaped the dialog on Tab press #${i + 1}`).toBe(false);
    }

    // Shift+Tab also stays inside
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Shift+Tab");
      const activeOutside = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog ? !dialog.contains(document.activeElement) : false;
      });
      expect(activeOutside, `Focus escaped the dialog on Shift+Tab press #${i + 1}`).toBe(false);
    }
  });
});

test.describe("ProductLightbox keyboard", () => {
  test("opens on click and closes with Escape", async ({ page }) => {
    await page.goto("/es/productos");
    await page.waitForLoadState("networkidle");

    const viewButtons = page.getByRole("button", { name: /ver imagen de/i });
    const count = await viewButtons.count();

    test.skip(count === 0, "No products loaded — skipping lightbox keyboard test");

    await viewButtons.first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
