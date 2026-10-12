/**
 * Serialises a JSON-LD payload for an inline `<script type="application/ld+json">`.
 *
 * `JSON.stringify` does NOT escape `<`, `>` or `/`: a value containing
 * `</script>` would terminate the script element early and the remainder of the
 * payload would be parsed as HTML by the browser. Escaping those characters as
 * JSON unicode escapes keeps the output valid JSON (any JSON parser decodes
 * `</script>` back to the original characters, so schema.org consumers see the
 * same data) while making the HTML sink safe.
 *
 * This matters here because JSON-LD payloads are built from database content
 * (FAQ questions/answers and product names), which is admin-authored.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
