import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("keeps ordinary payloads byte-identical to JSON.stringify", () => {
    const value = { "@type": "Organization", name: "Mas Cerca AP", count: 2 };
    expect(serializeJsonLd(value)).toBe(JSON.stringify(value));
  });

  it("produces valid JSON that round-trips to the original value", () => {
    const value = { question: "¿Cómo se prepara?", answer: "A&B <C>D" };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it("cannot emit a closing script tag from database content", () => {
    const value = { answer: "</script><script>alert(1)</script>" };
    const html = serializeJsonLd(value);

    expect(html).not.toContain("</script");
    expect(html).not.toContain("<");
    expect(html).toContain("\\u003c/script\\u003e");
    // Still a faithful JSON encoding of the original string.
    expect(JSON.parse(html).answer).toBe("</script><script>alert(1)</script>");
  });

  it("escapes every angle bracket, not just the first occurrence", () => {
    expect(serializeJsonLd({ a: "<", b: ">", c: "&&" })).toBe(
      '{"a":"\\u003c","b":"\\u003e","c":"\\u0026\\u0026"}',
    );
  });

  it("encodes unicode content without corruption (es/en FAQ text)", () => {
    const value = { text: "Pulpa de guanábana — ¿listo? 🥭" };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });
});
