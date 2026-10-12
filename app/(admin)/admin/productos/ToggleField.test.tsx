import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ToggleField } from "./ToggleField";

describe("ToggleField", () => {
  it("exposes switch semantics to assistive technology", () => {
    const html = renderToStaticMarkup(
      <ToggleField label="Destacado" value onChange={() => {}} />
    );

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    // The switch's accessible name must match its visible label.
    expect(html).toContain('aria-label="Destacado"');
  });

  it("reports the off state", () => {
    const html = renderToStaticMarkup(
      <ToggleField label="Agotado" value={false} onChange={() => {}} />
    );

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-label="Agotado"');
  });

  it("keeps the control inside its label so the whole row is clickable", () => {
    const html = renderToStaticMarkup(
      <ToggleField label="Visible" value={false} onChange={() => {}} />
    );

    expect(html.startsWith("<label")).toBe(true);
    expect(html).toContain('type="button"');
  });
});
