# Lecciones Aprendidas — Mas Cerca AP
> Archivo para uso del asistente AI. Documenta fallas reales cometidas en este proyecto
> y las reglas derivadas de ellas. Leer ANTES de escribir código nuevo.
> Última actualización: 2026-04-18

---

## SEGURIDAD

### L-SEC-01 — Links externos siempre con `target` + `rel`
**Falla cometida:** El CTA del slide 5 en `HeroCarousel.tsx` usaba `<Link>` de Next.js para una URL externa de WhatsApp (`wa.me/...`) sin `target="_blank"` ni `rel="noopener noreferrer"`. El usuario perdía el contexto de la app al hacer clic.

**Regla:**
```tsx
// Detectar si el href es externo ANTES de renderizar
const isExternal = href.startsWith("http");
<Link
  href={href}
  {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
>
```
**Aplica a:** cualquier componente que resuelva hrefs dinámicamente (carruseles, CTAs, cards).

---

### L-SEC-02 — Nunca hardcodear datos sensibles como fallback
**Falla cometida:** `lib/config.ts` tenía `whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573001234567"`. El número real se bundleaba en el cliente si la env var no estaba configurada.

**Regla:** El fallback de variables de entorno públicas debe ser `""` o `undefined`, nunca un valor real de producción.
```ts
whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
```

---

### L-SEC-03 — API routes públicas SIEMPRE necesitan rate limiting
**Falla cometida:** `/api/contact` no tenía rate limiting. Un bot podía enviar cientos de requests y agotar el cupo de Resend.

**Regla:** Toda API route pública que llame a un servicio externo de pago (email, SMS, AI) debe tener rate limiting desde el día 1. Implementación mínima aceptable:
```ts
// In-memory sliding window — suficiente para un formulario de contacto
const requestLog = new Map<string, number[]>();
// 5 requests por IP por minuto
```
Si se proyecta alto tráfico: migrar a `@upstash/ratelimit` + Vercel KV.

---

## BUNDLE / PERFORMANCE

### L-PERF-01 — "use client" solo si hay hooks o eventos del browser
**Falla cometida:** `Footer.tsx` estaba marcado como `"use client"` únicamente para poder consumir `useDictionary()` (Context de React). El footer es completamente estático — no tiene estado, no tiene eventos. Todo su bundle se mandaba al cliente innecesariamente.

**Regla:** Antes de agregar `"use client"` preguntarse:
1. ¿Usa `useState`, `useEffect`, u otro hook de estado?
2. ¿Maneja eventos del browser (`onClick`, `onScroll`, etc.)?
3. ¿Usa APIs exclusivas del cliente (`localStorage`, `window`, etc.)?

Si la única razón es consumir un Context, **pasar los datos como props desde el Server Component padre**.

**Patrón correcto para el Footer:**
```tsx
// app/[lang]/layout.tsx (Server Component) — pasa dict y lang directo
<Footer dict={dict} lang={lang} />

// Footer.tsx — Server Component puro, sin "use client"
export default function Footer({ dict, lang }: { dict: Dictionary; lang: Locale }) { ... }
```

---

## INTERNACIONALIZACIÓN (i18n)

### L-I18N-01 — CERO strings hardcodeados en componentes
**Falla cometida:** Varios strings en español estaban hardcodeados en componentes de una app multilingüe:
- `aria-label="Enviar"` en `ChatBotPanel.tsx`
- `"Ingredientes:"` y `"Beneficios:"` en `ProductLightbox.tsx`
- `alt="Más Cerca AP"` en `NosotrosPageContent.tsx`

**Regla:** Cualquier texto visible al usuario (incluyendo `aria-label`, `alt`, `placeholder`, `title`) DEBE venir del diccionario i18n. Antes de hardcodear una string preguntarse: "¿Este texto aparece en pantalla o es leído por un lector de pantalla?". Si la respuesta es sí → al diccionario.

**Patrón correcto:**
```tsx
// MAL
aria-label="Enviar"
alt="Más Cerca AP"

// BIEN
aria-label={t.sendAriaLabel}
alt={t.history.imageAlt}
```

---

## ACCESIBILIDAD

### L-A11Y-01 — `<div role="button">` nunca — usar `<button>` nativo
**Falla cometida:** `FlipCard` en `NosotrosPageContent.tsx` usaba `<motion.div role="button" tabIndex={0}>`. Aunque funcionaba visualmente, los lectores de pantalla tienen soporte inconsistente para `div[role=button]`.

**Regla:** Framer Motion soporta `motion.button` de forma nativa. Usarlo siempre que el elemento sea interactivo. Agregar `aria-pressed` cuando el botón tiene estado toggle.
```tsx
// MAL
<motion.div role="button" tabIndex={0}>

// BIEN
<motion.button aria-pressed={flipped}>
// Y el ref debe tiparlo como HTMLButtonElement, no HTMLDivElement
const ref = useRef<HTMLButtonElement>(null);
```

---

### L-A11Y-02 — Inputs siempre con `<label>` o `aria-label`
**Falla cometida:** El input del chatbot en `ChatBotPanel.tsx` solo tenía `placeholder`. Los lectores de pantalla no anuncian el placeholder cuando el campo tiene foco o contenido.

**Regla:** Todo `<input>` y `<textarea>` debe tener una de estas:
- `<label htmlFor="id">` visible (preferido)
- `<label className="sr-only">` si el diseño no permite label visible

```tsx
<label htmlFor="chatbot-input" className="sr-only">{t.inputLabel}</label>
<input id="chatbot-input" ... />
```

---

### L-A11Y-03 — `alt` debe describir el contenido, no el nombre de la marca
**Falla cometida:** `alt="Más Cerca AP"` en la imagen de historia de la empresa. Esto le dice al lector de pantalla el nombre de la empresa pero nada sobre lo que muestra la imagen.

**Regla:** El `alt` debe responder: "¿Qué vería alguien que SÍ puede ver la imagen?". Siempre externalizarlo al diccionario i18n para que se traduzca.

```tsx
// MAL: alt="Más Cerca AP"
// BIEN: alt="Fundadoras de Más Cerca AP en su bodega de producción en Chía"
```

---

## ARQUITECTURA / TIPOS

### L-TS-01 — `types/index.ts` es el punto de importación único
**Falla cometida:** `ContactFormData` vivía solo en `lib/schemas/contact.ts` y se importaba directamente desde ahí en varios archivos. El propósito de `types/index.ts` es ser el único lugar de importación de tipos.

**Regla:** Cuando un tipo se infiere desde Zod, Prisma u otra librería externa, re-exportarlo desde `types/index.ts`:
```ts
// types/index.ts
export type { ContactFormData } from "@/lib/schemas/contact";
```
Los consumers importan desde `@/types`, no desde `@/lib/schemas/*`.

---

## OBSERVABILIDAD

### L-OBS-01 — Nunca suprimir errores de servicios externos en silencio
**Falla cometida:** Las queries a Sanity en `app/[lang]/page.tsx` tenían `.catch(() => [])`. Si Sanity fallaba en producción, el sitio mostraba datos desactualizados sin ningún log ni alerta.

**Regla:** Los fallbacks silenciosos ocultan incidentes. El catch SIEMPRE debe logguear el error:
```ts
client.fetch(QUERY).catch((err: unknown) => {
  console.error("[Sanity] Failed to fetch:", err);
  return [];
});
```
En producción, Vercel captura estos `console.error` en los logs del proyecto.

---

## CHECKLIST PRE-COMMIT

Antes de considerar un componente terminado, verificar:

- [ ] ¿Todos los strings visibles/accesibles vienen del diccionario i18n?
- [ ] ¿Todos los links externos tienen `target="_blank" rel="noopener noreferrer"`?
- [ ] ¿Los componentes sin hooks/eventos del browser evitan `"use client"`?
- [ ] ¿Las inputs tienen `<label>` o `aria-label` desde el diccionario?
- [ ] ¿Los elementos interactivos son `<button>` o `<a>` nativos (no divs)?
- [ ] ¿Las imágenes tienen `alt` descriptivo y localizado?
- [ ] ¿Las API routes públicas que llaman servicios externos tienen rate limiting?
- [ ] ¿Los catch de servicios externos logguean el error antes de retornar fallback?
- [ ] ¿Ninguna variable de entorno tiene un valor real de producción como fallback?

---

*Documento vivo — actualizar cada vez que se detecte y corrija una nueva clase de error.*
