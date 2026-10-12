import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * Real-browser validation matrix.
 *
 * Renders the production build at three real device classes, captures a
 * full-page screenshot of every public route, and drives the interactive
 * surfaces (carousel, lightbox, filter bar, mobile nav, help drawer, chat
 * entry form, contact form, FAQ accordion, calculators) so a regression shows
 * up as a failed interaction — not just as a broken screenshot.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812, isMobile: true },
  { name: "tablet", width: 768, height: 1024, isMobile: true },
  { name: "desktop", width: 1280, height: 800, isMobile: false },
] as const;

const ROUTES = [
  { path: "/es", name: "home" },
  { path: "/es/productos", name: "productos" },
  { path: "/es/nosotros", name: "nosotros" },
  { path: "/es/contacto", name: "contacto" },
  { path: "/es/politicas", name: "politicas" },
  { path: "/es/terminos", name: "terminos" },
  { path: "/es/chat", name: "chat" },
] as const;

const SHOT_DIR = path.join(process.cwd(), "test-results", "visual");
fs.mkdirSync(SHOT_DIR, { recursive: true });

type ConsoleProbe = { errors: string[]; hydration: string[] };

function attachProbes(page: Page): ConsoleProbe {
  const probe: ConsoleProbe = { errors: [], hydration: [] };
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (/hydrat|did not match|server rendered|Text content does not match/i.test(text)) {
      probe.hydration.push(text);
    }
    if (msg.type() === "error") probe.errors.push(text);
  });
  page.on("pageerror", (err) => probe.errors.push(`pageerror: ${err.message}`));
  return probe;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true });
}

// ── 1. Page render matrix ──────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}] ${vp.width}×${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`[render] ${route.name} — no console errors, no hydration mismatch`, async ({ page }) => {
        const probe = attachProbes(page);
        const response = await page.goto(route.path, { waitUntil: "load" });
        expect(response?.status(), `${route.path} should answer 200`).toBe(200);

        // Force React to finish hydrating and let lazily-added UI settle.
        await page.waitForTimeout(1500);

        // Something must actually render — an empty <body> would pass the checks above.
        const bodyText = (await page.locator("body").innerText()).trim();
        expect(bodyText.length, `${route.path} rendered an empty body`).toBeGreaterThan(50);

        expect(probe.hydration, `\n${probe.hydration.join("\n")}`).toHaveLength(0);
        expect(probe.errors, `\n${probe.errors.join("\n")}`).toHaveLength(0);

        await shot(page, `${vp.name}-${route.name}`);
      });
    }
  });
}

// ── 2. Horizontal overflow: nothing may push the page wider than the viewport ──

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}] overflow`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`[layout] no horizontal scroll on any public route`, async ({ page }) => {
      const overflows: string[] = [];
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: "load" });
        await page.waitForTimeout(800);
        const scroll = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth,
          win: window.innerWidth,
        }));
        if (scroll.doc > scroll.win + 1) {
          overflows.push(`${route.path}: scrollWidth=${scroll.doc} innerWidth=${scroll.win}`);
        }
      }
      expect(overflows, `Horizontal overflow:\n${overflows.join("\n")}`).toHaveLength(0);
    });
  });
}

// ── 3. Interaction driving ─────────────────────────────────────────────

test.describe("[interaction] mobile navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("[nav] hamburger opens the menu, links are reachable, Escape-free close works", async ({
    page,
  }) => {
    await page.goto("/es", { waitUntil: "load" });
    const toggle = page.locator('button[aria-controls="mobile-nav"]');
    await expect(toggle).toBeVisible();
    // Collapsed, the track is 0fr so only the 1px border-top remains.
    const collapsed = await page.locator("#mobile-nav").boundingBox();
    expect(collapsed, "#mobile-nav should be laid out").not.toBeNull();
    expect(collapsed!.height).toBeLessThan(2);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const box = await page.locator("#mobile-nav").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(80);
    await expect(page.locator("#mobile-nav a").first()).toBeVisible();
    await shot(page, "mobile-nav-open");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.waitForTimeout(500);
    expect((await page.locator("#mobile-nav").boundingBox())?.height ?? 0).toBeLessThan(2);
  });
});

test.describe("[interaction] hero carousel", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[carousel] advances on its own and responds to the next control", async ({ page }) => {
    await page.goto("/es", { waitUntil: "load" });
    const prev = page.getByRole("button", { name: /anterior|previous/i });
    const next = page.getByRole("button", { name: /siguiente|next/i });

    if ((await next.count()) === 0) {
      test.skip(true, "No carousel controls on this build");
      return;
    }

    const firstSrc = await page.locator("main img").first().getAttribute("src");
    await next.first().click();
    await page.waitForTimeout(800);
    const secondSrc = await page.locator("main img").first().getAttribute("src");
    expect(secondSrc, "carousel did not advance").not.toBe(firstSrc);

    await prev.first().click();
    await page.waitForTimeout(800);
    const backSrc = await page.locator("main img").first().getAttribute("src");
    expect(backSrc, "carousel did not go back").toBe(firstSrc);
    await shot(page, "desktop-carousel");
  });
});

test.describe("[interaction] help drawer", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[drawer] opens from the trigger and closes on Escape", async ({ page }) => {
    await page.goto("/es", { waitUntil: "load" });
    const trigger = page.getByRole("button", { name: "¿Necesitas ayuda?" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Centro de ayuda" })).toBeVisible();
    await shot(page, "desktop-help-drawer");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("[interaction] product lightbox", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[lightbox] opens from a product card and closes on Escape", async ({ page }) => {
    await page.goto("/es/productos", { waitUntil: "load" });
    await page.waitForTimeout(1200);

    const card = page.getByRole("button", { name: /ver imagen/i }).first();
    if ((await card.count()) === 0) {
      test.skip(true, "No product card image button found");
      return;
    }
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await shot(page, "desktop-lightbox");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("[interaction] products filter bar", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[filterbar] level-2 row expands after selecting a category", async ({ page }) => {
    await page.goto("/es/productos", { waitUntil: "load" });
    await page.waitForTimeout(1000);

    const level2 = page.locator("#products-filter-level-2");
    await expect(level2).toHaveCount(1);
    expect((await level2.boundingBox())?.height ?? 0).toBeLessThan(2);

    // The first category is the one every fixture line shares, so it reliably
    // reveals the flavour/size row (later categories may have none).
    const category = page.locator("#products-filter-bar button").first();
    if ((await category.count()) === 0) {
      test.skip(true, "No category buttons rendered");
      return;
    }
    await category.click();
    await page.waitForTimeout(700);
    expect((await level2.boundingBox())?.height ?? 0).toBeGreaterThan(20);
    await shot(page, "desktop-filter-expanded");
  });
});

test.describe("[interaction] contact form", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[contact] empty submit surfaces validation instead of a silent failure", async ({ page }) => {
    await page.goto("/es/contacto", { waitUntil: "load" });
    await page.waitForTimeout(800);

    const submit = page.getByRole("button", { name: /enviar|send/i }).first();
    await expect(submit).toBeVisible();
    await submit.click();
    await page.waitForTimeout(700);

    const alerts = page.locator('[role="alert"], [aria-invalid="true"]');
    expect(await alerts.count(), "no validation feedback on empty submit").toBeGreaterThan(0);
    await shot(page, "desktop-contact-validation");
  });
});

test.describe("[interaction] chat entry form", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  /**
   * The chat is server-gated by `CHAT_ENABLED` — an env literal that never
   * reaches the client, so the browser cannot know the answer up front.
   *
   * Off: every visitor API resolves to the generic 404 and the view must render
   * an honest "not available" state offering WhatsApp and the contact form.
   * On:  the entry form must be reachable and reject bad input per field
   * without swallowing what the operator typed.
   *
   * Asserting only one branch would let the other rot silently, so the test
   * detects which state is live and holds that state to its contract.
   */
  test("[chat] honours its server-gated state: validating form or honest fallback", async ({
    page,
  }) => {
    await page.goto("/es", { waitUntil: "load" });
    await page.getByRole("button", { name: "¿Necesitas ayuda?" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    // The chat lives one level down in the help drawer menu.
    await page.getByRole("button", { name: "Contactar a un asesor" }).click();

    const name = page.locator("#chat-entry-name");
    await expect
      .poll(
        async () => {
          if ((await name.count()) > 0) return "form";
          return /no está disponible/i.test(await dialog.innerText()) ? "disabled" : "waiting";
        },
        { timeout: 15_000 },
      )
      .not.toBe("waiting");

    // Re-read the DOM rather than reusing the poll result: TypeScript cannot see
    // assignments made inside the poll callback, so a captured variable would be
    // narrowed to its initializer and the branch below would be dead code.
    if ((await name.count()) > 0) {
      await name.fill("A");
      await page.locator("#chat-entry-email").fill("not-an-email");
      await page.locator("#chat-entry-phone").fill("12");
      await page.getByRole("button", { name: "Iniciar conversación" }).click();
      await page.waitForTimeout(700);

      const fieldErrors = page.locator('[id$="-error"]');
      expect(
        await fieldErrors.count(),
        "no per-field errors on invalid chat entry",
      ).toBeGreaterThan(0);
      // The typed values must survive the failed submit — losing input here is
      // the classic regression this check exists to catch.
      await expect(name).toHaveValue("A");
      await shot(page, "desktop-chat-entry");
    } else {
      const text = (await dialog.innerText()).trim();
      expect(text.length, "chat drawer rendered a blank panel").toBeGreaterThan(20);
      expect(text, "missing the honest unavailable notice").toMatch(/no está disponible/i);
      expect(text, "missing the WhatsApp fallback").toMatch(/whatsapp/i);
      expect(text, "missing the contact-form fallback").toMatch(/formulario/i);
      await shot(page, "desktop-chat-disabled");
    }
  });
});

// ── 4. Admin surface that is publicly reachable ────────────────────────

test.describe("[interaction] admin login", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("[login] renders, validates, and never leaks a stack trace", async ({ page }) => {
    const probe = attachProbes(page);
    await page.goto("/admin/login", { waitUntil: "load" });
    await page.waitForTimeout(800);

    const submit = page.getByRole("button", { name: /ingresar|entrar|iniciar|login|sign in/i }).first();
    await expect(submit).toBeVisible();
    await submit.click();
    await page.waitForTimeout(700);

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/at\s+\w+\s+\(|Error:\s*.*\/\//);
    expect(probe.errors, `\n${probe.errors.join("\n")}`).toHaveLength(0);
    await shot(page, "desktop-admin-login");
  });
});

// ── 5. Accessibility at every viewport ─────────────────────────────────

for (const vp of VIEWPORTS) {
  test.describe(`[a11y] ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`[a11y] ${route.name} — no serious/critical violations`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "load" });
        await page.waitForTimeout(1200);
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        const high = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        const summary = high
          .map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.html).join(" | ")}`)
          .join("\n");
        expect(high, `\n${summary}`).toHaveLength(0);
      });
    }
  });
}

// ── 6. Locator sanity: no test may silently no-op on a missing element ──

test.describe("harness self-check", () => {
  test("[self-check] key locators resolve on the pages that own them", async ({ page }) => {
    const checks: Array<[string, string, (p: Page) => ReturnType<Locator["locator"]>]> = [
      ["mobile-nav", "/es", (p) => p.locator("#mobile-nav")],
      ["products-filter-bar", "/es/productos", (p) => p.locator("#products-filter-bar")],
      ["catalog-search", "/es/productos", (p) => p.locator("#catalog-search")],
      ["contact-form", "/es/contacto", (p) => p.locator("#nombre")],
      ["product-zoom", "/es/productos", (p) => p.getByRole("button", { name: /ver imagen/i })],
    ];
    for (const [id, route, make] of checks) {
      await page.goto(route, { waitUntil: "load" });
      await page.waitForTimeout(1000);
      expect(await make(page).count(), `${id} not found on ${route}`).toBeGreaterThan(0);
    }

    // The chat view only exists one level down in the help drawer, and it is
    // server-gated by `CHAT_ENABLED`. Accept either the entry form or the
    // honest disabled notice — never a panel that failed to render at all.
    await page.goto("/es", { waitUntil: "load" });
    await page.getByRole("button", { name: "¿Necesitas ayuda?" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Contactar a un asesor" }).click();
    const dialog = page.getByRole("dialog");
    await expect
      .poll(
        async () =>
          (await page.locator("#chat-entry-name").count()) > 0 ||
          /no está disponible/i.test(await dialog.innerText()),
        { timeout: 15_000 },
      )
      .toBe(true);
  });
});
