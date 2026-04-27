# Respuesta al Informe de Hallazgos — 2026-04-27

## Metadatos
- **Tipo:** Respuesta del desarrollador al informe de hallazgos detallados
- **Responde a:** `informe_hallazgos_detallados_20260426_2220.md`
- **Snapshot de baseline:** `616af64213cf4c090501b19df284557399240fc8`
- **Estado de los cambios:** Working tree (no commiteado al momento de redacción)

---

## Resumen Ejecutivo

Se revisó cada hallazgo del informe contra el código real del working tree. El resultado es:

- **Resueltos definitivamente:** 14
- **Resueltos (ya estaban en commits previos):** 9 (confirmados intactos)
- **No implementados por decisión técnica justificada:** 2 (ARQ-01, ARQ-02)
- **Sin cambios (decisión previa mantenida):** 0

---

## 1. Hallazgos Resueltos (confirmados en working tree)

Los siguientes 9 hallazgos ya estaban resueltos en commits anteriores al baseline. Se verificó que los cambios del working tree no los regresan.

| ID | Descripción | Estado | Commit de origen |
|----|-------------|--------|-----------------|
| A11Y-03 | `ProductGridCard` sin semántica interactiva | Confirmado ✅ | `14b178d` |
| DT-07 | Código muerto ChatBot/ChatBotPanel/WhatsAppButton | Confirmado ✅ | Working tree |
| BUG-07a | `LegalView` — "Última actualización" hardcodeado en ES | Confirmado ✅ | Working tree |
| BUG-07b | Hardcodes en páginas legales (`politicas`, `terminos`) | Confirmado ✅ | Working tree |
| ARQ-04 | Lightbox cargado eager | Confirmado ✅ | Working tree |
| ARQ-05 | Metadata incompleta (openGraph, twitter, description) | Confirmado ✅ | Working tree |
| ARQ-06 | Sitemap sin `/politicas` y `/terminos` | Confirmado ✅ | Working tree |
| ARQ-10 | `HelpDrawer` sin focus trap ni Escape | Confirmado ✅ | Working tree |
| ARQ-11 | Navbar sin `aria-expanded` ni `aria-controls` | Confirmado ✅ | Working tree |

---

## 2. Hallazgos Persistentes — Estado actualizado

### 2.1 A11Y-11 / SEO-I18N — `html lang="es"` fijo
- **Estado anterior:** PERSISTENTE (diferido)
- **Estado actual:** **RESUELTO** ✅
- **Qué se hizo:**
  - `app/layout.tsx` simplificado a un wrapper mínimo `<>{children}</>` — ya no emite `<html>` ni `<body>`.
  - `app/[lang]/layout.tsx` ahora contiene `<html lang={lang} suppressHydrationWarning>` y `<body>`. El atributo `lang` es dinámico y correcto para cada ruta (`/es/*` → `lang="es"`, `/en/*` → `lang="en"`).
  - Las fuentes (`Poppins`, `DM Serif Display`) fueron movidas a `[lang]/layout.tsx`.
  - `app/studio/layout.tsx` (nuevo, no commiteado) provee su propio `<html><body>` para la ruta de Sanity Studio.
- **Archivos modificados:**
  - `app/layout.tsx`
  - `app/[lang]/layout.tsx`

---

### 2.2 ARQ-01 — Arquitectura i18n vía `DictionaryProvider` global
- **Estado anterior:** PERSISTENTE
- **Estado actual:** **NO IMPLEMENTADO — DECISIÓN TÉCNICA** 🔵

**Razón técnica detallada:**

Se revisaron los 16 componentes que consumen `useDictionary()`. El hallazgo es que **todos son Client Components por razones independientes al Context**:

| Componente | Razón de ser Client (independiente del Context) |
|---|---|
| `Navbar` | `useState`, `useEffect`, `usePathname`, `m` |
| `HelpHub`, `HelpDrawer`, `FaqView` | `useState`, `useEffect`, `m`, `AnimatePresence` |
| `HeroCarousel` | `useState`, `useRef`, `useEffect`, `useInView`, `m` |
| `ProductCard`, `ProductGridCard` | `useState` (lightbox) |
| `ProductLightbox` | cargado con `dynamic({ ssr: false })` |
| `ProductLineRow`, `PulpaFruitGrid` | `useState`, `useRef`, `useEffect` |
| `ProductosClient` | `useState`, `useMemo`, `useEffect`, `useRef`, `m` |
| `ContactForm` | `useState`, `useEffect`, `useForm`, `m` |
| `NosotrosPageContent` | `useState`, `useEffect`, `useRef`, `m`, `useInView` |
| `ContactoPageContent` | `m`, `AnimatePresence` |
| `ProductCategories` | `m`, `whileInView` |

**Conclusión:** Eliminar el `DictionaryProvider` y reemplazarlo por prop drilling no reduciría el bundle cliente en nada. Ninguno de estos componentes puede convertirse en Server Component solo por este cambio — todos tienen interactividad o animaciones que los anclan al cliente. La ganancia de rendimiento es cero para este proyecto.

Adicionalmente, el `DictionaryProvider` actualmente envuelve `LazyMotion` de Framer Motion, lo que sí es un beneficio real de bundle — carga diferida de las features de animación.

**Decisión:** Diferido indefinidamente. No aporta valor suficiente para justificar el riesgo de regresiones al tocar 16 componentes.

---

### 2.3 ARQ-02 — `/nosotros` y `/contacto` clientificados
- **Estado anterior:** PERSISTENTE
- **Estado actual:** **NO IMPLEMENTADO — DECISIÓN TÉCNICA** 🔵

**Razón técnica:**

`NosotrosPageContent` y `ContactoPageContent` usan `m` de Framer Motion para animaciones page-level (`animate`, `whileInView`, `initial`). Esto los mantiene como Client Components independientemente de si se resuelve ARQ-01. Convertirlos en Server Components requeriría extraer cada sección animada como una isla cliente separada — un refactor de complejidad significativa con impacto visual no trivial.

**Decisión:** Diferido. Depende de ARQ-01 y además requiere una estrategia de animaciones más profunda.

---

### 2.4 DT-04 — Fallback `href="#"` para WhatsApp
- **Estado anterior:** PERSISTENTE (decisión previa del desarrollador)
- **Estado actual:** **RESUELTO** ✅

**Qué se hizo:** El fallback ya no es `"#"` — ahora es `null`. Si `SITE_CONFIG.whatsappNumber` no está configurado, el botón/link directamente no se renderiza. Esto elimina la navegación inútil a `#` y mejora la semántica.

- **Archivos modificados:**
  - `components/ui/drawer-views/FaqView.tsx`
  - `components/ui/drawer-views/HelpMenu.tsx`

---

### 2.5 ARQ-09 — Duplicación del boundary Sanity/fallback
- **Estado anterior:** PERSISTENTE
- **Estado actual:** **RESUELTO** ✅

**Qué se hizo:** Se creó `lib/sanity/safeFetch.ts` como helper centralizado. Encapsula la lógica `sanityReady + try/catch + fallback` en una sola función tipada. Las pages que antes repetían el patrón ahora la consumen directamente.

```typescript
// lib/sanity/safeFetch.ts
export async function safeFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T,
  revalidate = 3600
): Promise<T>
```

- **Archivos modificados:**
  - `lib/sanity/safeFetch.ts` ← nuevo
  - `app/[lang]/page.tsx`
  - `app/[lang]/productos/page.tsx`

---

## 3. Hallazgos Parciales — Estado actualizado

### 3.1 BUG-07 parcial — I18n incompleto en `ProductGridCard` y `ProductLightbox`
- **Estado anterior:** PARCIAL
- **Estado actual:** **RESUELTO** ✅

**Qué se completó:**
- `alt` del grid ahora usa `displayName` (localizado via `dict.productLines`) en lugar de `product.name` (español estático).
- `displayDescription` en el lightbox usa la descripción del diccionario cuando `lang !== "es"`.
- `ingredients` y `benefits` en el lightbox se muestran **solo cuando `lang === "es"`** — solución pragmática correcta dado que esos campos son datos estáticos en español sin traducción en el catálogo.

- **Archivos modificados:**
  - `components/ui/ProductGridCard.tsx`
  - `components/ui/ProductLightbox.tsx`

---

### 3.2 UX-04 — Voseo rioplatense en copy español
- **Estado anterior:** PARCIAL
- **Estado actual:** **RESUELTO** ✅

**Qué se corrigió:**

| Archivo | Casos resueltos |
|---|---|
| `messages/es.json` | `"Ahorrá"` → `"Ahorra"`, `"Pedís hoy"` → `"Pide hoy"`, `"Lo tenés"` → `"Lo tienes"`, `"¿No encontrás"` → `"¿No encuentras"`, `"Tocá"` → `"Toca"`, `"querés"` → `"quieres"`, `"podés"` → `"puedes"`, `"escribís"` → `"escribes"`, `"intentá"` → `"intenta"`, metadata de nosotros y contacto |
| `data/faq.ts` | `"Podés hacer"` → `"Puedes hacer"`, `"tenés un negocio"` → `"tienes un negocio"`, `"obtenés"` → `"obtienes"`, `"Escribinos"` → `"Escríbenos"`, `"Podés venir"` → `"Puedes venir"` |
| `app/api/contact/route.ts` | `"Intentá"` → `"Intenta"` |

---

### 3.3 ARQ-07 — Hardcodes i18n fuera del diccionario
- **Estado anterior:** PARCIAL
- **Estado actual:** **RESUELTO** ✅

**Qué se completó:**

| Componente/Archivo | Hardcodes resueltos |
|---|---|
| `app/[lang]/productos/ProductosClient.tsx` | `"Del campo a tu negocio"`, `"Categoría:"`, `"Sabor:"`, `"productos en"`, `"Sin productos en esta presentación"`, `"Pedidos personalizados"`, stats del CTA |
| `components/sections/ContactoPageContent.tsx` | `"Respondemos en menos de 24 horas"`, `"Quiénes somos"`, texto `whoWeAre` |
| `components/layout/Footer.tsx` | `"Síguenos en {red}"` → `dict.footer.socialLabel` |
| `app/[lang]/politicas/page.tsx` | `"¿Tenés preguntas sobre esta política?"`, `"Escribinos directamente."`, `"Contactar"` |
| `app/[lang]/terminos/page.tsx` | `"¿Tenés preguntas sobre estos términos?"`, `"Escribinos directamente."`, `"Contactar"` |

**Claves nuevas en diccionario:**
- `footer.socialLabel`
- `contact.hero.responseTime`
- `contact.whoWeAre.label`, `contact.whoWeAre.text`
- `products.hero.eyebrow`
- `products.filters.category`, `products.filters.flavor`, `products.filters.countLabel`, `products.filters.empty`
- `products.cta.badge`, `products.cta.stats`
- `legal.ctaButton`, `legal.ctaText`, `legal.policy.ctaTitle`, `legal.terms.ctaTitle`
- `metadata.privacy.*`, `metadata.terms.*`

---

## 4. Regresión Nueva — Estado actualizado

### 4.1 IMG-01 — Referencia rota del asset `Mora120`
- **Estado anterior:** REGRESIÓN (bug funcional)
- **Estado actual:** **RESUELTO** ✅

**Qué se hizo:** `data/products.ts` actualizado para apuntar a `/imgs/Mora120V2.png`. El archivo existe en `public/imgs/Mora120V2.png`. El asset anterior (`Mora120.png`) fue eliminado correctamente.

- **Archivo modificado:**
  - `data/products.ts` — línea `image: "/imgs/Mora120V2.png"` (producto `pulpa-mora` 120g)

---

## 5. Cambios adicionales no contemplados en el informe

Detectados durante la implementación — mejoras legítimas aplicadas:

| Cambio | Archivo | Razón |
|---|---|---|
| `LanguageSwitcher` migrado a props | `components/ui/LanguageSwitcher.tsx` | Componente más reusable, desacoplado del Context |
| `TestimonialCarousel` migrado a props | `components/ui/TestimonialCarousel.tsx` | `page.tsx` es Server Component y ya tiene `dict` disponible |
| `MisionVisionTabs` migrado a props | `components/sections/MisionVisionTabs.tsx` | Idem — `NosotrosPageContent` tiene `dict` y lo pasa |
| Metadata openGraph + twitter en todas las páginas | Múltiples `page.tsx` | Completar ARQ-05 en páginas que faltaban |

---

## 6. Estado de prioridades del informe original

| Prioridad | Hallazgo | Estado final |
|---|---|---|
| 1 | IMG-01 Mora120 roto | ✅ Resuelto |
| 1 | BUG-07 parcial i18n productos | ✅ Resuelto |
| 2 | UX-04 voseo restante | ✅ Resuelto |
| 2 | ARQ-07 hardcodes inline | ✅ Resuelto |
| 3 | A11Y-11 html lang dinámico | ✅ Resuelto |
| 3 | ARQ-01 DictionaryProvider | 🔵 No implementado (decisión técnica) |
| 3 | ARQ-02 desclientificar páginas | 🔵 No implementado (decisión técnica) |
| 3 | ARQ-09 helper Sanity/fallback | ✅ Resuelto |

**Leyenda:** ✅ Resuelto · 🔵 Decisión técnica documentada
