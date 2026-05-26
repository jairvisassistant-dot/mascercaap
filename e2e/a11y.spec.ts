import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type AxeViolation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

function formatViolations(violations: AxeViolation[]): string {
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.description}\n` +
        v.nodes
          .slice(0, 2)
          .map((n) => `  → ${n.html}`)
          .join("\n")
    )
    .join("\n\n");
}

const PAGES = [
  { path: "/es", name: "home" },
  { path: "/es/productos", name: "productos" },
  { path: "/es/nosotros", name: "nosotros" },
  { path: "/es/contacto", name: "contacto" },
];

for (const { path, name } of PAGES) {
  test(`[a11y] ${name} — no critical/serious wcag violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const high = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(high, `\n${formatViolations(high)}`).toHaveLength(0);
  });
}
