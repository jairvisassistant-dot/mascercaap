import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TagListSection } from "./TagListSection";

const noop = () => {};

const render = (items: string[]) =>
  renderToStaticMarkup(
    <TagListSection
      title="Ingredientes"
      items={items}
      newValue=""
      inputAriaLabel="Nuevo ingrediente"
      inputPlaceholder="Agregar ingrediente..."
      onNewValueChange={noop}
      onAdd={noop}
      onRemove={noop}
    />
  );

describe("TagListSection", () => {
  it("gives every icon-only remove button its own accessible name", () => {
    const html = render(["Harina", "Azúcar"]);

    expect(html).toContain("✕");
    expect(html).toContain('aria-label="Quitar Harina"');
    expect(html).toContain('aria-label="Quitar Azúcar"');
  });

  it("labels the text input and the icon-only add button", () => {
    const html = render([]);

    expect(html).toContain('aria-label="Nuevo ingrediente"');
    expect(html).toContain('aria-label="Agregar"');
    expect(html).toContain(">");
    // The add button must stay a real button, not a bare clickable span.
    expect(html.match(/type="button"/g)?.length).toBe(1);
  });
});
