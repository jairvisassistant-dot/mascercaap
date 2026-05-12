# Pendientes Post-Auditoría — 2026-05-11
> Actualizado: 2026-05-12 — todos los hallazgos accionables resueltos.

---

## Estado final de los 11 hallazgos

| ID | Hallazgo | Severidad | Estado | Commit |
|---|---|---|---|---|
| P-01 | Zod monolingüe español | HIGH | ✅ Resuelto | `8febccf` |
| P-02 | Overlines hardcodeados | LOW | ✅ Resuelto | `f987b49` |
| P-03 | DictionaryProvider alta superficie | MED | ⏸️ Diferido | — |
| P-04 | Doble fuente de verdad catálogo | MED | ✅ Resuelto | `11a0719` |
| P-05 | SEC-07 — Admin sin validar ADMIN_EMAIL | HIGH | ✅ Resuelto | `8febccf` |
| P-06 | OrderAssistant /en/ español | HIGH | ✅ Resuelto | `8febccf` |
| P-07 | OrderAssistant catálogo paralelo | HIGH | ✅ Resuelto | `8febccf` |
| P-08 | Bloque whatsapp JSON sin uso claro | MED | ✅ Resuelto | `8febccf` |
| P-09 | label="Limón" hardcodeado | LOW | ✅ Resuelto | `8febccf` |
| P-10 | whatsappNumber sin validación | LOW | ✅ Resuelto | `8febccf` |
| P-11 | suppressHydrationWarning innecesario | LOW | ✅ Resuelto | `8febccf` |

**10/11 resueltos — 1 diferido por decisión del desarrollador.**

---

## Detalle por hallazgo

### ✅ P-01 — Zod monolingüe (`8febccf`)
`app/api/contact/route.ts` detecta el locale vía el header `Referer` y pasa los mensajes de `messages/es.json` o `messages/en.json` a `createContactSchema()`. Usuarios en `/en/` reciben errores de validación en inglés.

### ✅ P-02 — Overlines hardcodeados (`f987b49`)
`WhyChooseUs`, `FeaturedProducts`, `DailyOffer`, `ProductCategories`, `NosotrosPageContent` y `YieldCalculator` consumen `sectionLabel` desde el diccionario i18n.

### ⏸️ P-03 — DictionaryProvider alta superficie
**Decisión: diferido indefinidamente.**
De los 40 archivos con `"use client"`, solo 3 lo son únicamente por el contexto de i18n (`OrderAssistantCTA`, `HelpMenu`, `WhatsAppConnectView`). El resto serían clientes de todas formas por animaciones, hooks o routing. El costo de migrar supera el beneficio para el volumen actual del proyecto.

### ✅ P-04 — Doble fuente de verdad catálogo (`11a0719`)
Eliminados todos los fallbacks a `data/products.ts` y `data/testimonials.ts` en `lib/supabase/queries.ts`. Las funciones `getAllProducts`, `getFeaturedProducts`, `getAllTestimonials`, `getAllProductLines` y `getAllProductCategories` leen exclusivamente de Supabase. `data/products.ts` queda como seed/referencia histórica sin uso en runtime.

### ✅ P-05 — Admin sin validar ADMIN_EMAIL (`8febccf`)
`lib/admin-session.ts` — añadido `user.email !== process.env.ADMIN_EMAIL` tras validar JWT. Cualquier usuario autenticado en Supabase que no sea el admin es redirigido a logout.

### ✅ P-06 — OrderAssistant /en/ español (`8febccf`)
`ZONE_LABELS`, `URGENCY_LABELS`, `PROFILE_LABELS` eran dead code (nunca exportados ni llamados). Eliminados junto con los tipos huérfanos `DeliveryZone` y `Urgency`.

### ✅ P-07 — OrderAssistant catálogo paralelo (`8febccf`)
Eliminados `PRICES_COP`, `LACTEOS_PRICES` y `getUnitPrice` de `lib/order-assistant.ts`. Añadidos `PriceEntry` y `buildPriceResolver()` compartidos. `PriceProvider` (`lib/prices/PriceProvider.tsx`) carga precios de Supabase en el Server Component del layout y los distribuye por contexto. `OrderAssistantView` usa `usePrices()` — UI y email de confirmación usan la misma fuente.

### ✅ P-08 — Bloque whatsapp JSON huérfano (`8febccf`)
Eliminado el bloque top-level `whatsapp.message` de `messages/es.json` y `messages/en.json`. Ningún componente lo consumía.

### ✅ P-09 — `label="Limón"` hardcodeado (`8febccf`)
Eliminado el prop `label="Limón"` de `BrandFruitMark.tsx`. Con `decorative={true}`, `EmojiIcon` aplica `aria-hidden` e ignora el label — el prop era dead code.

### ✅ P-10 — `whatsappNumber` sin validación (`8febccf`)
`lib/config.ts` emite `console.warn` en startup si `NEXT_PUBLIC_WHATSAPP_NUMBER` no está configurada (excepto en entorno `test`).

### ✅ P-11 — `suppressHydrationWarning` innecesario (`8febccf`)
Eliminados los dos `suppressHydrationWarning` en `app/admin/login/page.tsx`. Los `<div>` contenedores no tienen contenido dinámico entre servidor y cliente.
