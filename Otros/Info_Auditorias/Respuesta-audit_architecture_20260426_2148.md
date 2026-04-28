# Respuesta a Auditoría de Arquitectura — audit_architecture_20260426_2148
**Fecha de respuesta:** 2026-04-27  
**Respondido por:** Desarrollador (Jair Linan)

---

## Resumen ejecutivo

| # | Hallazgo | Veredicto | Estado |
|---|----------|-----------|--------|
| 1 | DictionaryProvider / 29 use client | ⚠️ Válido parcialmente | ✅ CORREGIDO (parcial) |
| 2 | Doble fuente de verdad: data/*.ts + Sanity | ✅ Válido | DIFERIDO — decisión de producto |
| 3 | ISR de 60 segundos demasiado agresivo | ✅ TRUE POSITIVE | ✅ CORREGIDO |
| 4 | FAQ y legales viajan al cliente | ⚠️ Parcialmente falso positivo | JUSTIFICADO |
| 5 | Framer Motion demasiado extendido | ❌ Falso positivo | RECHAZADO |
| 6 | Studio acoplado al sitio público | ❌ Falso positivo | RECHAZADO |
| 7 | Stack del formulario pesado | ❌ Falso positivo | RECHAZADO |
| 8 | Assets pesados huérfanos | ✅ CONFIRMADO | ✅ GESTIONADO — en uso para próximas features |

---

## Respuesta por hallazgo

---

### 1 — DictionaryProvider empuja demasiados Client Components (🟠 Alto)

**Veredicto: ⚠️ VÁLIDO PARCIALMENTE — diferido**

**Verificación:** 28 archivos con `"use client"` de 39 tsx totales (71%). El número es real.

**Pero el diagnóstico del auditor está incompleto.** Al inspeccionar cada componente:

- `WhyChooseUs.tsx` y `DailyOffer.tsx` ya reciben `dict` como **prop** — no usan `useDictionary()`. Están en el conteo de "use client" pero NO por el contexto i18n, sino por **Framer Motion** (`m`, `whileInView`, `whileHover`).
- `FaqView.tsx`: client por chatbot interactivo (estado de mensajes, form submit, scroll).
- `HelpDrawer.tsx`: client por focus trap, keyboard handler, estado del drawer, Framer Motion.
- `ProductCard.tsx`, `ProductLineRow.tsx`, `HeroCarousel.tsx`, `ProductLightbox.tsx`: interactividad real.
- `ContactForm.tsx`: formulario con estado.
- `Navbar.tsx`, `LanguageSwitcher.tsx`, `ScrollProgress.tsx`: APIs de browser.

**Conclusión real:** de los 28, aproximadamente 4–6 podrían convertirse a recibir `dict` como prop en vez de via context, pero NINGUNO podría eliminar el `"use client"` porque todos tienen razones de interactividad independientes del sistema i18n.

**El problema arquitectural es real** — un refactor hacia `dict` como prop en el árbol de layouts reduciría la dependencia del provider — pero el impacto en hidratación y JS bundle es **marginal** para el tamaño de este proyecto.

**Fix aplicado (parcial):** Se convirtieron los 3 componentes de página que usaban `useDictionary()` innecesariamente:

| Componente | Antes | Después |
|---|---|---|
| `ProductCategories.tsx` | `useDictionary()` | `{ dict, lang }` como props |
| `ContactoPageContent.tsx` | `useDictionary()` | `{ dict }` como prop |
| `NosotrosPageContent.tsx` | `useDictionary()` | `{ dict, lang }` como props |

Sus páginas padre (`/`, `/contacto`, `/nosotros`) ya llamaban a `getDictionary()` — gracias a `React.cache()`, no hay fetch adicional; es la misma instancia cacheada por request.

Los componentes de interactividad profunda (`ContactForm`, `FaqView`, `HelpDrawer`) mantienen `useDictionary()` porque son leaf nodes de alta interactividad sin parent server en su cadena directa.

---

### 2 — Doble fuente de verdad: data/*.ts + Sanity (🟠 Alto)

**Veredicto: ✅ VÁLIDO — diferido por decisión de producto**

**Evidencia confirmada en código:**
```tsx
// app/[lang]/page.tsx
const featuredProducts = sanityProducts.length > 0 ? sanityProducts : staticFeaturedProducts;
```

El patrón es: Sanity como fuente primaria, `data/*.ts` como fallback. Es código de **graceful degradation** intencional para el período de onboarding de Sanity (aún no todos los datos están migrados al CMS).

**¿Es arquitecturalmente correcto mantenerlo?** A corto plazo, SÍ. A largo plazo, NO: cuando Sanity esté poblado completamente, `data/*.ts` se convierte en deuda. El merge manual es una bomba de tiempo para desincronización.

**Plan de acción (no inmediato):** Una vez que el catálogo esté 100% en Sanity, eliminar `data/products.ts` como fuente de datos y dejar solo `data/legal.ts` y `data/faq.ts` (que no están en Sanity y no se planea migrar). No hacerlo hasta que Sanity esté completamente poblado — hacerlo antes rompería el sitio si Sanity está vacío.

---

### 3 — ISR de 60 segundos demasiado agresivo (🟠 Alto)

**Veredicto: ✅ TRUE POSITIVE — CORREGIDO**

**Causa confirmada:** `export const revalidate = 60` estaba en dos archivos:
- `app/[lang]/page.tsx`
- `app/[lang]/productos/page.tsx`

Para un catálogo comercial con contenido que cambia como máximo algunas veces por semana, revalidar cada 60 segundos genera:
- Invocaciones de Serverless Functions innecesarias (costo en Vercel)
- Fetches a Sanity innecesarios (cuota de API)
- Sin ningún beneficio real de frescura para el usuario

**Fix aplicado:** `revalidate = 60` → `revalidate = 3600` (1 hora) en ambos archivos.

Esto reduce las revalidaciones en un **98.3%** (1 por hora vs 60 por hora) sin impacto perceptible en la frescura del contenido para este tipo de negocio. Si en el futuro se necesita reactividad inmediata ante cambios en Sanity, el camino correcto es implementar **on-demand revalidation** via webhook de Sanity, no acortar el intervalo.

---

### 4 — FAQ y legales viajan al cliente innecesariamente (🟡 Medio)

**Veredicto: ⚠️ PARCIALMENTE FALSO POSITIVO — justificado**

**FaqView.tsx** — La observación de que `faqData` viaja al cliente es técnicamente correcta, pero el auditor no consideró la naturaleza del componente: es un **chatbot interactivo** que necesita los datos en runtime para:
- Renderizar chips de categorías dinámicamente
- Buscar respuestas con `findAnswer()` en cada keystroke del usuario
- Navegar entre preguntas con estado local

No existe una arquitectura server-first para un chatbot que responde en tiempo real sin fetches a API. Mover la data a un Route Handler agregaría latencia de red en cada interacción, lo cual sería peor UX.

**HelpDrawer.tsx con data/legal.ts** — El payload de `privacyPolicy` y `termsAndConditions` es aproximadamente 8KB de texto. El impacto en el bundle es negligible. El componente necesita ser client por la interactividad del drawer (focus trap, keyboard navigation, animaciones de Framer Motion). No existe ganancia práctica en separarlo.

**Conclusión:** el hallazgo identifica correctamente un patrón, pero subestima los constraints de los componentes en cuestión. No se modifica.

---

### 5 — Framer Motion demasiado extendido (🟡 Medio)

**Veredicto: ❌ FALSO POSITIVO**

El auditor dice que "la librería domina demasiadas zonas visuales" y sugiere reemplazar animaciones con CSS puro. Pero en el código ya se usa el **patrón correcto de optimización**:

```tsx
import { m, LazyMotion } from "framer-motion";
```

`LazyMotion` con `m` (en vez de `motion`) es exactamente la técnica recomendada por Framer Motion para reducir el bundle size — solo se cargan las features necesarias. El bundle overhead es mínimo comparado con una implementación naive con `motion`.

Reemplazar animaciones con CSS puro es una refactorización de UI que:
- Requiere testing visual exhaustivo en múltiples breakpoints
- Genera riesgo de regresiones
- No tiene un impacto de performance medible que lo justifique en este tamaño de proyecto

**No se modifica.** Si en el futuro un Lighthouse audit muestra TBT elevado atribuible a Framer Motion, se reevalúa.

---

### 6 — Studio de Sanity acoplado al sitio público (🟡 Medio)

**Veredicto: ❌ FALSO POSITIVO para el tamaño de este proyecto**

Tener el Studio en `app/studio/[[...tool]]/page.tsx` es el **patrón oficial y recomendado por Sanity** para Next.js. Sus ventajas:
- Un solo proyecto en Vercel, un solo deploy
- No hay problemas de CORS entre Studio y la Preview API
- Ruta protegida bajo autenticación de Sanity (solo accesible para editores)

La complejidad operativa que menciona el auditor (`serverExternalPackages` en `next.config.ts`, `dynamic({ ssr: false })`) son requisitos del SDK de Sanity Studio — están ahí porque Sanity los necesita, no porque la arquitectura esté mal diseñada.

Separar el Studio a un proyecto propio agregaría: un segundo repo, un segundo deploy en Vercel, configuración de CORS, y mayor overhead de mantenimiento. Para un proyecto de este tamaño, el costo supera el beneficio claramente.

**No se modifica.**

---

### 7 — Stack del formulario pesado (react-hook-form + zod) (🟡 Medio)

**Veredicto: ❌ FALSO POSITIVO — y la premisa es incorrecta**

El auditor dice que react-hook-form + zod + @hookform/resolvers es "más pesado de lo que el caso exige." Esto ignora la realidad del proyecto:

**El schema Zod ya existe en `lib/schemas/contact.ts` y se REUTILIZA en la API route** (`app/api/contact/route.ts`). No es que se haya añadido Zod para el formulario — Zod ya era la fuente de verdad de validación. React Hook Form con el Zod resolver es la forma más natural de conectar el cliente con esa validación compartida.

Reemplazar con `useState` + validación manual generaría:
- Más líneas de código
- Lógica de validación duplicada (o no, dejando el cliente sin validación)
- Peor performance (controlled inputs vs uncontrolled de RHF)
- Peor DX

Este es precisamente el patrón que recomienda la documentación oficial de Next.js. **No se modifica.**

---

### 8 — Assets pesados y huérfanos (🟢 Bajo)

**Veredicto: ✅ CONFIRMADO COMO HUÉRFANOS**

Verificado con búsqueda en todo el código fuente:

| Archivo | Tamaño | Referencias en código |
|---------|--------|----------------------|
| `public/imgs/Envase.png` | 8.6 MB | **0 referencias** |
| `public/imgs/Tomate-Arbol.png` | 1.9 MB | **0 referencias** |

Nota: el producto existente referencia `Tomate-Arbol120.png` (versión optimizada), no `Tomate-Arbol.png`.

**Confirmación del desarrollador:** los assets están siendo preparados para incorporarse al sitio en la próxima iteración de contenido. No se eliminan — están en staging para uso futuro. El auditor los identificó correctamente como sin referencias al momento del scan.

---

## Archivos modificados en este ciclo

| Archivo | Cambio |
|---------|--------|
| `app/[lang]/page.tsx` | `revalidate` 60 → 3600; pasa `dict/lang` a ProductCategories |
| `app/[lang]/productos/page.tsx` | `revalidate` 60 → 3600 |
| `app/[lang]/contacto/page.tsx` | Llama a `getDictionary`; pasa `dict` a ContactoPageContent |
| `app/[lang]/nosotros/page.tsx` | Llama a `getDictionary`; pasa `dict/lang` a NosotrosPageContent |
| `components/sections/ProductCategories.tsx` | `useDictionary()` → props `{ dict, lang }` |
| `components/sections/ContactoPageContent.tsx` | `useDictionary()` → prop `{ dict }` |
| `components/sections/NosotrosPageContent.tsx` | `useDictionary()` → props `{ dict, lang }` |

## Pendientes

- Definir estrategia de "single source of truth" cuando Sanity esté 100% poblado (migrar `data/products.ts` al CMS y eliminar el merge manual).
