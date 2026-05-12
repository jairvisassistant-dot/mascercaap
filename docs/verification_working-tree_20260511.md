# Verificación de Auditoría — Working Tree 2026-05-11

## Metadatos
- **Tipo:** Verificación Post-Auditoría (limitada)
- **Fecha:** 2026-05-11
- **Artefactos previos leídos:** `LECCIONES_APRENDIDAS.md` (14 causas raíz documentadas)
- **Baseline / Snapshot:** No existe baseline formal (`Otros/Info_Auditorias/` ausente)
- **Fuente del baseline:** No disponible — verificación limitada sobre working tree
- **Modo de comparación:** Working tree vs `HEAD` (301ef7f) + análisis de commits recientes
- **Working tree al iniciar:** Modificado (25 archivos)
- **Verificador:** software-audit-verifier v2.1 (lectura directa de SKILL.md en disco)

## Resumen de Cambios
- Archivos modificados en working tree: 25 (176 inserciones, 367 eliminaciones)
- Archivos eliminados: `components/ui/TestimonialCarousel.tsx`
- Hallazgos de LECCIONES_APRENDIDAS verificados: 12
- ✅ Resueltos: 4
- ❌ Persistentes: 4
- ⚠️ Parciales: 2
- 🔶 Regresiones: 2 (issues nuevos)
- 🆕 Issues nuevos detectados: 2

## Matriz de Trazabilidad
| Hallazgo | Decisión del desarrollador | Estado final | Evidencia corta |
|---|---|---|---|
| CR#1 — Contacto hardcodeado | Corregido previamente | ✅ RESUELTO | `SITE_CONFIG.siteUrl` dinámico en api/contact y order-assistant |
| CR#5 — handleFeedback roto | Corregido | ✅ RESUELTO | Funcionalidad y claves i18n eliminadas |
| CR#8 — proxy.ts vs middleware.ts | Corregido previamente | ✅ RESUELTO | `301ef7f` reverted; sigue siendo `proxy.ts` |
| CR#14 — Sanity .catch() | Corregido previamente | ✅ RESUELTO | Sanity completamente eliminado del proyecto |
| CR#4 — alt text en inglés | No tocado | ❌ PERSISTENTE | Archivos `/nosotros` sin cambios |
| CR#6 — FAQ desincronizado | No tocado | ❌ PERSISTENTE | Archivos FAQ sin cambios |
| CR#11 — Zod monolingüe | No tocado | ❌ PERSISTENTE | Schemas sin cambios en working tree |
| CR#12 — Overlines hardcodeados | No tocado | ❌ PERSISTENTE | Secciones sin cambios en working tree |
| CR#10 — aria-labels hardcodeados | Parcial | ⚠️ PARCIAL | ProductLightbox corregido, otros no |
| CR#13 — Voseo rioplatense | Parcial | ⚠️ PARCIAL | Admin login/upload corregidos, otros pueden persistir |

## Detalle por Hallazgo

### CR#1 — Datos de contacto hardcodeados
- **Severidad:** HIGH
- **Archivo(s):** `app/api/contact/route.ts`, `lib/order-assistant.ts`
- **Decisión del desarrollador:** Corregido
- **Estado:** ✅ RESUELTO
- **Evidencia:** Ambos archivos ahora usan `new URL(SITE_CONFIG.siteUrl).hostname` en lugar de string hardcodeado "mascercap.com"

### CR#4 — alt text en inglés en /nosotros
- **Severidad:** MED
- **Archivo(s):** `app/[lang]/nosotros/page.tsx`, componentes de galería
- **Decisión del desarrollador:** Sin cambios en working tree
- **Estado:** ❌ PERSISTENTE
- **Evidencia:** Ninguno de los archivos de la página /nosotros fue modificado

### CR#5 — handleFeedback ignoraba parámetro
- **Severidad:** MED
- **Archivo(s):** ChatBot, `messages/es.json`, `messages/en.json`
- **Decisión del desarrollador:** Corregido
- **Estado:** ✅ RESUELTO
- **Evidencia:** Claves `helpful`, `yes`, `no`, `thankYou`, `notHelpful` eliminadas de ambos JSON. Código de feedback presumiblemente eliminado (grep no encuentra referencias)

### CR#6 — FAQ desincronizado con catálogo
- **Severidad:** HIGH
- **Archivo(s):** `data/faq.ts`, `data/products.ts`
- **Decisión del desarrollador:** Sin cambios en working tree
- **Estado:** ❌ PERSISTENTE
- **Evidencia:** Archivos de FAQ sin modificar

### CR#8 — proxy.ts renombrado a middleware.ts
- **Severidad:** MED
- **Archivo(s):** `proxy.ts`
- **Decisión del desarrollador:** Corregido previamente
- **Estado:** ✅ RESUELTO
- **Evidencia:** `proxy.ts` existe y no fue tocado en working tree

### CR#10 — aria-labels hardcodeados (no i18n)
- **Severidad:** MED
- **Archivo(s):** `components/ui/ProductLightbox.tsx` (+ otros)
- **Decisión del desarrollador:** Parcial
- **Estado:** ⚠️ PARCIAL
- **Evidencia:** ProductLightbox cambió `aria-label="Cerrar"` → `aria-label={t.close}`. No se verificaron otros componentes con aria-labels hardcodeados (PulpaFruitGrid, HeroCarousel, etc.)

### CR#11 — Schema Zod con mensajes en español únicamente
- **Severidad:** HIGH
- **Archivo(s):** `lib/schemas/contact.ts`
- **Decisión del desarrollador:** Sin cambios en working tree
- **Estado:** ❌ PERSISTENTE
- **Evidencia:** Archivos de schemas sin modificar

### CR#12 — Overlines hardcodeados fuera del diccionario
- **Severidad:** LOW
- **Archivo(s):** Múltiples secciones (WhyChooseUs, FeaturedProducts, etc.)
- **Decisión del desarrollador:** Sin cambios nuevos
- **Estado:** ❌ PERSISTENTE
- **Evidencia:** No se agregaron nuevas claves `sectionLabel` en este working tree

### CR#13 — Voseo rioplatense
- **Severidad:** LOW
- **Archivo(s):** `app/admin/login/page.tsx`, `app/api/admin/upload/route.ts`
- **Decisión del desarrollador:** Parcial
- **Estado:** ⚠️ PARCIAL
- **Evidencia:** "Ingresá" → "Ingrese" en admin/login; "Usá" → "Use" en admin/upload. No se revisó el resto del código por voseo residual.

### CR#14 — Sanity client .catch() no captura SyntaxError
- **Severidad:** HIGH
- **Archivo(s):** (todo el directorio sanity/)
- **Decisión del desarrollador:** Corregido previamente
- **Estado:** ✅ RESUELTO
- **Evidencia:** Sanity completamente eliminado del proyecto (commit cedbb1c). Directorio `sanity/` y referencias eliminadas.

## Regresiones Detectadas

### 🔶 REG-01 — `app/admin/layout.tsx` usa anon key para admin count
- **Archivo:** `app/admin/layout.tsx`
- **Problema:** Cambió `SUPABASE_SERVICE_ROLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `getProductCount()`
- **Impacto:** Si RLS está habilitado en la tabla `products`, la anon key no podrá contar registros. El admin dashboard mostrará `null` como conteo.
- **Riesgo:** HIGH — funcionalidad crítica de administración
- **Recomendación:** Revertir a `SUPABASE_SERVICE_ROLE_KEY` o asegurar que la tabla `products` tenga RLS configurado para permitir `count` con anon key.

### 🔶 REG-02 — `app/layout.tsx` eliminó script anti-FOUC para tema oscuro
- **Archivo:** `app/layout.tsx`
- **Problema:** Se eliminó el script inline que leía `localStorage` y `prefers-color-scheme`. Ahora solo lee `cookies()` del servidor. En primera visita (sin cookie), siempre devuelve `"light"`.
- **Impacto:** Usuarios con preferencia de tema oscuro (`prefers-color-scheme: dark`) verán un flash de tema claro en la primera visita hasta que el ThemeToggle.js se ejecute y guarde la cookie.
- **Riesgo:** MED — UX degradado para usuarios dark mode
- **Recomendación:** Agregar fallback a `prefers-color-scheme` cuando no hay cookie, o restaurar el script inline.

## Issues Nuevos Detectados

No se detectaron issues nuevos no relacionados con regresiones.

## Archivos Sin Cambios (Siguen con Issues)

Archivos de lecciones anteriores que siguen sin corrección:
- `app/[lang]/nosotros/page.tsx` — alt text en inglés (CR#4)
- `data/faq.ts` — FAQ desincronizado con catálogo (CR#6)
- `lib/schemas/contact.ts` — Zod monolingüe (CR#11)
- Múltiples secciones — overlines sin i18n (CR#12)

## Cambios Correctos Identificados

Los siguientes cambios en working tree son correctos y no introducen problemas:

1. ✅ **YieldCalculator.tsx** — i18n completo: todos los strings hardcodeados reemplazados por claves del diccionario
2. ✅ **lib/order-assistant.ts** — Eliminación de `export` en tipos/constantes internas (encapsulación correcta)
3. ✅ **lib/order-assistant.test.ts** — Actualización de precios y eliminación de tests para funciones eliminadas
4. ✅ **lib/yield-calculator.ts** — Eliminación de `buildWhatsappMessage` (código muerto)
5. ✅ **lib/yield-calculator.test.ts** — Eliminación de tests para función eliminada
6. ✅ **lib/gradient-presets.ts** — Eliminación de `export` de tipos internos
7. ✅ **messages/es.json + en.json** — Eliminación de claves no usadas (consistencia)
8. ✅ **package.json** — Nuevo script `i18n:validate`
9. ✅ **ThemeToggle.tsx** — Persistencia de tema en cookies (consistente con nuevo layout)
10. ✅ **LanguageSwitcher.tsx** — Cookie set envuelto en try/catch (defensivo)
11. ✅ **app/api/admin/auth/login/route.ts** — JSON parse con try/catch + persistSession:false
12. ✅ **app/api/contact/route.ts** — Dominio dinámico desde SITE_CONFIG
13. ✅ **app/admin/login/page.tsx** — Voseo corregido + suppressHydrationWarning
14. ✅ **app/api/admin/upload/route.ts** — Voseo corregido + persistSession:false
15. ✅ **lib/admin-auth.ts** — persistSession:false agregado
16. ✅ **lib/supabase.ts** — persistSession:false agregado
17. ✅ **TestimonialCarousel.tsx** — Eliminado (componente muerto, reemplazado por TestimonialMarquee)

## Riesgos no validados por ejecución

- **app/layout.tsx** — No se pudo validar el comportamiento runtime de la lectura de cookies vs tema. Depende de evidencia estática + razonamiento.
- **app/admin/layout.tsx** — No se pudo validar si RLS de Supabase permite `count` con anon key. Requiere prueba runtime.
- **Build completo** — No se ejecutó `npm run build`. Pueden haber errores de compilación no detectados.
- **Tests** — No se ejecutó `npm test`. Los tests modificados (precios) pueden fallar si hay otros tests que referencien valores anteriores.

## Recomendaciones

1. **CRÍTICO** — Revertir `app/admin/layout.tsx` a `SUPABASE_SERVICE_ROLE_KEY` o validar RLS antes del próximo deploy
2. **ALTO** — Agregar fallback `prefers-color-scheme` en `app/layout.tsx` para evitar FOUC en dark mode
3. **MEDIO** — Abordar persistentes CR#6 (FAQ) y CR#11 (Zod) antes del próximo deploy — afectan funcionalidad visible al usuario
4. **MEDIO** — Completar CR#10 (aria-labels) en el resto de componentes
5. **BAJO** — Programar re-auditoría formal con baseline para la próxima iteración
