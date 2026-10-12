import { test, expect, type Page } from "@playwright/test";

/**
 * Real runtime verification — CSP nonce, JSON-LD sink safety and hydration.
 *
 * These assertions only hold in a production build (`next build` + `next start`),
 * because dev mode serves `unsafe-eval`/looser policies and React dev builds
 * surface hydration problems with a different message shape.
 */

const PUBLIC_PAGES = [
  { path: "/es", name: "home" },
  { path: "/es/productos", name: "productos" },
  { path: "/es/nosotros", name: "nosotros" },
  { path: "/es/contacto", name: "contacto" },
  { path: "/es/politicas", name: "politicas" },
  { path: "/es/terminos", name: "terminos" },
];

type ConsoleProbe = {
  errors: string[];
  cspViolations: string[];
  hydration: string[];
};

function attachProbes(page: Page): ConsoleProbe {
  const probe: ConsoleProbe = { errors: [], cspViolations: [], hydration: [] };

  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (/Content Security Policy|CSP|Refused to/i.test(text)) probe.cspViolations.push(text);
    if (/hydrat|did not match|server rendered|Text content does not match/i.test(text)) {
      probe.hydration.push(text);
    }
    if (msg.type() === "error") probe.errors.push(text);
  });

  page.on("pageerror", (err) => {
    probe.errors.push(`pageerror: ${err.message}`);
  });

  // Collect CSP violations reported through the reporting API / securitypolicyviolation.
  // Playwright does not type this event name, so narrow through EventEmitter.
  (page as unknown as NodeJS.EventEmitter).on(
    "securitypolicyviolation",
    (e: SecurityPolicyViolationEvent) => {
      probe.cspViolations.push(`${e.violatedDirective}: ${e.blockedURI} (${e.sourceFile})`);
    }
  );

  return probe;
}

test.describe("runtime — CSP nonce", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`[csp] ${name}: enforced header carries a nonce and every inline script matches`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response, `no response for ${path}`).not.toBeNull();

      const header = response!.headers()["content-security-policy"] ?? "";
      expect(header, `missing Content-Security-Policy on ${path}`).not.toBe("");
      expect(header, `enforced CSP on ${path} must carry a nonce`).toContain("nonce-");

      const headerNonce = /'nonce-([^']+)'/.exec(header)?.[1];
      expect(headerNonce, `nonce not parseable from header on ${path}`).toBeTruthy();

      // Every <script> that is subject to script-src must be nonce'd.
      const result = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll("script"));
        return scripts.map((s) => ({
          nonce: s.nonce || s.getAttribute("nonce") || "",
          src: s.getAttribute("src") ?? "(inline)",
          type: s.getAttribute("type") ?? "",
          hasInner: (s.textContent ?? "").length > 0,
        }));
      });

      for (const s of result) {
        if (!s.hasInner && s.src !== "(inline)") continue; // external, 'self'-hosted
        expect(s.nonce, `${name}: inline script without nonce → ${s.src}`).toBe(headerNonce!);
      }
    });
  }
});

test.describe("runtime — JSON-LD sink safety", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`[jsonld] ${name}: payloads parse and cannot close the script element`, async ({ page }) => {
      await page.goto(path);

      const payloads = await page.evaluate(() =>
        Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
          (s) => s.textContent ?? "",
        ),
      );

      expect(payloads.length, `${name}: expected at least one JSON-LD block`).toBeGreaterThan(0);

      for (const raw of payloads) {
        // A raw `</script>` inside the JSON would have truncated the element already;
        // if the text still parses, nothing terminated it early.
        expect(raw).not.toContain("</script>");
        expect(() => JSON.parse(raw)).not.toThrow();
      }

      // No escaped-bomb: serializeJsonLd emits \u003c, which JSON.parse decodes back.
      const decodedHasScript = payloads.some((raw) => {
        try {
          return JSON.stringify(JSON.parse(raw)).includes("</script>");
        } catch {
          return false;
        }
      });
      // If a payload decodes to something containing `</script>`, it must have been
      // stored escaped in the raw text — which the assertion above already proved.
      if (decodedHasScript) {
        expect(payloads.every((raw) => !raw.includes("</script>"))).toBe(true);
      }
    });
  }
});

test.describe("runtime — no CSP violations or console errors", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`[console] ${name}: zero CSP violations and zero runtime errors`, async ({ page }) => {
      const probe = attachProbes(page);
      // `networkidle` never settles here: the chat widget keeps an SSE stream open
      // on every page, so the network is permanently "busy". Use `load` + a settle
      // window instead — long enough to cover hydration and the first render pass.
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(1500);

      expect(probe.cspViolations, `\n${probe.cspViolations.join("\n")}`).toHaveLength(0);
      expect(probe.errors, `\n${probe.errors.join("\n")}`).toHaveLength(0);
      expect(probe.hydration, `\n${probe.hydration.join("\n")}`).toHaveLength(0);
    });
  }
});

test.describe("runtime — hydration on mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("[hydration] home at 375px (HeroCarousel isMobile branch) reports no mismatch", async ({
    page,
  }) => {
    const probe = attachProbes(page);
    await page.goto("/es");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    expect(probe.hydration, `\n${probe.hydration.join("\n")}`).toHaveLength(0);
    expect(probe.cspViolations, `\n${probe.cspViolations.join("\n")}`).toHaveLength(0);
    expect(probe.errors, `\n${probe.errors.join("\n")}`).toHaveLength(0);
  });
});

test.describe("runtime — admin boundary", () => {
  test("[admin] /admin/inbox without a session redirects to /admin/login", async ({ page }) => {
    const response = await page.goto("/admin/inbox");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("[admin] login page renders with a nonce'd CSP and no console errors", async ({ page }) => {
    const probe = attachProbes(page);
    const response = await page.goto("/admin/login");
    const header = response?.headers()["content-security-policy"] ?? "";
    expect(header).toContain("nonce-");

    await page.waitForLoadState("networkidle");
    expect(probe.cspViolations, `\n${probe.cspViolations.join("\n")}`).toHaveLength(0);
    expect(probe.errors, `\n${probe.errors.join("\n")}`).toHaveLength(0);
  });
});

test.describe("runtime — server-rendered HTML sanity", () => {
  test("[ssr] fetch /es directly: HTML already carries the nonce attribute", async ({ request }) => {
    const response = await request.get("/es");
    expect(response.ok()).toBeTruthy();

    const header = response.headers()["content-security-policy"] ?? "";
    const headerNonce = /'nonce-([^']+)'/.exec(header)?.[1];
    expect(headerNonce).toBeTruthy();

    const html = await response.text();
    expect(html).toContain(`nonce="${headerNonce}"`);
    // The FAQ JSON-LD sink must not contain a literal close tag in the payload.
    expect(html).not.toMatch(/<script[^>]*type="application\/ld\+json"[^>]*>[^<]*<\/script><\/script>/);
  });
});
