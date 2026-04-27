# Informe de Hallazgos Detallados — 2026-04-26 22:20

## Metadatos
- **Tipo:** Informe detallado de hallazgos post-auditoría
- **Fecha:** 2026-04-26 22:20
- **Base de análisis:**
  - `audit_code_20260426_2107.md`
  - `audit_architecture_20260426_2148.md`
  - `Respuesta-audit_code_20260426_2107.md`
  - `Respuesta-audit_architecture_20260426_2148.md`
  - `verification_20260426_2215.md`
- **Snapshot de referencia:** `616af64213cf4c090501b19df284557399240fc8`

---

## Resumen Ejecutivo

Se verificaron los cambios realizados después de las auditorías de código y arquitectura. El estado general muestra avances reales en accesibilidad, SEO técnico, limpieza de código muerto y optimización del lightbox, pero TODAVÍA persisten problemas estructurales de i18n, rendering y una regresión funcional nueva en assets.

### Estado consolidado
- **Hallazgos resueltos:** 9
- **Hallazgos persistentes:** 5
- **Hallazgos parciales:** 3
- **Regresiones nuevas:** 1

---

## 1. Hallazgos Resueltos

### 1.1 A11Y-03 — `ProductGridCard` no accesible
- **Severidad:** HIGH
- **Archivo:** `components/ui/ProductGridCard.tsx`
- **Problema original:** la interacción principal estaba montada sobre un `<div onClick>`, sin semántica interactiva ni soporte nativo de teclado.
- **Estado actual:** **RESUELTO**
- **Evidencia:** el wrapper principal pasó a ser `<button type="button">` con `disabled` y evento `onClick` sobre un control semántico.
- **Impacto del fix:** mejora navegación por teclado, foco nativo y semántica para tecnologías asistivas.

### 1.2 DT-07 — Código muerto `ChatBot / ChatBotPanel / WhatsAppButton`
- **Severidad:** HIGH
- **Archivos:**
  - `components/ui/ChatBot.tsx`
  - `components/ui/ChatBotPanel.tsx`
  - `components/layout/WhatsAppButton.tsx`
- **Problema original:** existía una rama huérfana de UI flotante que ya no formaba parte del árbol real de la app.
- **Estado actual:** **RESUELTO**
- **Evidencia:** los tres archivos fueron eliminados del árbol activo.
- **Impacto del fix:** reduce ruido de mantenimiento, evita confusión en futuras auditorías y elimina superficie de deuda técnica.

### 1.3 BUG-07 — `LegalView` mostraba “Última actualización” en inglés
- **Severidad:** MED
- **Archivo:** `components/ui/drawer-views/LegalView.tsx`
- **Problema original:** el label visible estaba hardcodeado en español.
- **Estado actual:** **RESUELTO**
- **Evidencia:** ahora el label bifurca correctamente entre `"Última actualización"` y `"Last updated"` según locale.
- **Impacto del fix:** mejora coherencia i18n del drawer legal.

### 1.4 BUG-07 — Hardcodes en páginas legales
- **Severidad:** MED
- **Archivos:**
  - `app/[lang]/politicas/page.tsx`
  - `app/[lang]/terminos/page.tsx`
  - `messages/es.json`
  - `messages/en.json`
- **Problema original:** los CTA y textos visibles estaban inline, fuera del diccionario, y además con voseo.
- **Estado actual:** **RESUELTO**
- **Evidencia:** se agregaron claves `legal.*`, `metadata.privacy.*` y `metadata.terms.*` al diccionario y los componentes ya consumen esos valores.
- **Impacto del fix:** mejor trazabilidad editorial, mejor mantenimiento i18n y menos hardcodes.

### 1.5 ARQ-04 — Lightbox cargado eager
- **Severidad:** HIGH
- **Archivos:**
  - `components/ui/ProductCard.tsx`
  - `components/ui/ProductGridCard.tsx`
- **Problema original:** `yet-another-react-lightbox` entraba al bundle aunque el usuario nunca abriera imágenes.
- **Estado actual:** **RESUELTO**
- **Evidencia:** ambos componentes usan `dynamic(() => import("./ProductLightbox"), { ssr: false })`.
- **Impacto del fix:** baja costo de JS inicial y retrasa descarga del lightbox hasta uso real.

### 1.6 ARQ-05 — Metadata incompleta
- **Severidad:** HIGH
- **Archivos:**
  - `app/[lang]/page.tsx`
  - `app/[lang]/nosotros/page.tsx`
  - `app/[lang]/contacto/page.tsx`
  - `app/[lang]/productos/page.tsx`
  - `app/[lang]/politicas/page.tsx`
  - `app/[lang]/terminos/page.tsx`
- **Problema original:** faltaban bloques `openGraph`, `twitter`, `description` y/o imágenes OG.
- **Estado actual:** **RESUELTO**
- **Evidencia:** las rutas auditadas ya incluyen metadata social y canonical/alternates.
- **Impacto del fix:** mejora previews sociales, consistencia SEO y cobertura metadata por ruta.

### 1.7 ARQ-06 — Sitemap incompleto
- **Severidad:** MED
- **Archivo:** `app/sitemap.ts`
- **Problema original:** faltaban `/politicas` y `/terminos`.
- **Estado actual:** **RESUELTO**
- **Evidencia:** ambas rutas fueron agregadas al arreglo del sitemap.
- **Impacto del fix:** mejora descubribilidad de páginas legales indexables.

### 1.8 ARQ-10 — `HelpDrawer` sin focus trap ni Escape
- **Severidad:** MED
- **Archivo:** `components/ui/HelpDrawer.tsx`
- **Problema original:** el drawer era usable visualmente, pero incompleto para teclado.
- **Estado actual:** **RESUELTO**
- **Evidencia:** ahora hay foco inicial al botón cerrar, manejo de `Escape` y contención de `Tab` / `Shift+Tab`.
- **Impacto del fix:** mejora accesibilidad real del overlay.

### 1.9 ARQ-11 — Menú mobile sin `aria-expanded` ni `aria-controls`
- **Severidad:** LOW
- **Archivo:** `components/layout/Navbar.tsx`
- **Problema original:** el botón hamburguesa no exponía su estado a tecnologías asistivas.
- **Estado actual:** **RESUELTO**
- **Evidencia:** se agregó `aria-expanded`, `aria-controls` y `id="mobile-nav"` al panel relacionado.
- **Impacto del fix:** mejora semántica accesible del menú responsive.

---

## 2. Hallazgos Persistentes

### 2.1 A11Y-11 / SEO-I18N — `html lang="es"` fijo
- **Severidad:** HIGH
- **Archivo:** `app/layout.tsx`
- **Problema:** toda la app, incluyendo `/en/*`, sigue renderizando `<html lang="es">`.
- **Estado actual:** **PERSISTENTE**
- **Evidencia:** el root layout todavía contiene `<html lang="es" suppressHydrationWarning>`.
- **Riesgo:** afecta screen readers, traducción automática y semántica SEO.
- **Observación:** el desarrollador lo marcó como hallazgo real pero diferido; esa evaluación es correcta.

### 2.2 ARQ-01 — Arquitectura i18n vía `DictionaryProvider` global
- **Severidad:** HIGH
- **Archivo/sistema:** `app/[lang]/layout.tsx` + consumidores `useDictionary()`
- **Problema:** se siguen empujando datos de servidor al cliente vía Context, obligando demasiados Client Components.
- **Estado actual:** **PERSISTENTE**
- **Evidencia:** no hubo desmonte del provider global ni migración sistemática a props desde Server Components.
- **Riesgo:** mayor bundle cliente, peor separación RSC/Client y deuda arquitectural acumulada.

### 2.3 ARQ-02 — `/nosotros` y `/contacto` siguen clientificados
- **Severidad:** HIGH
- **Archivos:**
  - `components/sections/NosotrosPageContent.tsx`
  - `components/sections/ContactoPageContent.tsx`
- **Problema:** páginas mayormente estáticas siguen bajando JS innecesario.
- **Estado actual:** **PERSISTENTE**
- **Evidencia:** solo hubo cambios de metadata en pages; no hubo split server shell + islas cliente.
- **Riesgo:** sobrehidratación y costo de rendering innecesario.

### 2.4 DT-04 — Fallback `href="#"` para WhatsApp
- **Severidad:** MED
- **Archivos:**
  - `components/ui/drawer-views/FaqView.tsx`
  - `components/ui/drawer-views/HelpMenu.tsx`
- **Problema:** si falta la env var, el CTA navega a `#`.
- **Estado actual:** **PERSISTENTE**
- **Evidencia:** el fallback sigue intacto.
- **Observación:** no es un olvido; fue una decisión explícita del desarrollador no corregirlo ahora.

### 2.5 ARQ-09 — Duplicación del boundary Sanity/fallback
- **Severidad:** MED
- **Archivos:**
  - `app/[lang]/page.tsx`
  - `app/[lang]/productos/page.tsx`
- **Problema:** el patrón `sanityReady + try/catch + fallback` sigue repetido.
- **Estado actual:** **PERSISTENTE**
- **Evidencia:** no aparece helper compartido ni abstracción nueva.
- **Riesgo:** cuando cambie la política de datos, habrá que tocar varios puntos.

---

## 3. Hallazgos Parciales

### 3.1 BUG-07 — I18n incompleto en `ProductGridCard` y `ProductLightbox`
- **Severidad:** HIGH
- **Archivos:**
  - `components/ui/ProductGridCard.tsx`
  - `components/ui/ProductLightbox.tsx`
  - `data/products.ts`
- **Problema original:** en `/en/productos` aparecían nombres, descripciones y datos del producto en español.
- **Estado actual:** **PARCIAL**
- **Qué sí se corrigió:**
  - se agregó `displayName`
  - se agregó `displayDescription`
  - la vista mejoró en el contenido principal
- **Qué sigue mal:**
  - el `alt` del grid sigue usando `product.name`
  - `ingredients` siguen saliendo desde datos estáticos en español
  - `benefits` siguen saliendo desde datos estáticos en español
- **Conclusión técnica:** el fix mejora la UI visible, pero NO cierra el problema de i18n de forma integral.

### 3.2 UX-04 — Voseo rioplatense todavía presente
- **Severidad:** MED
- **Archivos:**
  - `messages/es.json`
  - `data/faq.ts`
  - `app/api/contact/route.ts`
- **Problema original:** el sitio colombiano mezclaba voseo (`podés`, `querés`, `leé`, `contactá`, etc.).
- **Estado actual:** **PARCIAL**
- **Qué sí se corrigió:** varios casos en FAQ, chatbot, legales y API.
- **Qué sigue mal:** persisten textos como:
  - `"Conocé la historia..."`
  - `"Contactá a Más Cerca AP..."`
  - `"Conocé las políticas..."`
  - `"Leé los términos..."`
- **Conclusión técnica:** hubo limpieza parcial, pero todavía no existe normalización total del copy español.

### 3.3 ARQ-07 — Hardcodes i18n fuera del diccionario
- **Severidad:** MED
- **Archivos:**
  - `app/[lang]/politicas/page.tsx`
  - `app/[lang]/terminos/page.tsx`
  - `components/sections/ContactoPageContent.tsx`
  - `app/[lang]/productos/ProductosClient.tsx`
  - `components/layout/Footer.tsx`
- **Problema original:** había textos inline y ramas `lang === "es"` fuera del diccionario.
- **Estado actual:** **PARCIAL**
- **Qué sí se corrigió:** legales y metadata legal quedaron movidos al diccionario.
- **Qué sigue mal:** persisten ramas inline en:
  - `ContactoPageContent.tsx`
  - `ProductosClient.tsx`
  - `Footer.tsx`
- **Conclusión técnica:** se atacó una parte aislada del problema, pero la fuente única i18n todavía no gobierna toda la UI.

---

## 4. Regresión Nueva Detectada

### 4.1 IMG-01 — Referencia rota del asset `Mora120`
- **Severidad:** HIGH
- **Archivos:**
  - `data/products.ts`
  - `public/imgs/Mora120.png`
  - `public/imgs/Mora120V2.png`
- **Problema:** el catálogo sigue apuntando a `"/imgs/Mora120.png"`, pero ese archivo fue eliminado.
- **Estado actual:** **REGRESIÓN**
- **Evidencia:**
  - `data/products.ts` mantiene `image: "/imgs/Mora120.png"`
  - `public/imgs/Mora120.png` ya no está
  - existe `public/imgs/Mora120V2.png`, pero no está enlazado
- **Impacto:** la card `pulpa-mora-120` puede renderizar imagen rota o fallback visual no esperado.
- **Prioridad:** inmediata. Esto ya no es deuda; es bug funcional nuevo.

---

## 5. Validación de las respuestas del desarrollador

### Respuestas correctas del desarrollador
- Marcó correctamente `html lang` como problema real pero diferido.
- Marcó correctamente la eliminación de código muerto como fix válido.
- Marcó correctamente metadata, sitemap, navbar y HelpDrawer como puntos corregidos.
- Marcó correctamente que el fallback `href="#"` no se corrigió en este ciclo.

### Respuestas que quedaron solo parcialmente materializadas
- El desarrollador dio por corregido el problema de grid/lightbox en `/en`, pero técnicamente el fix quedó incompleto por `alt`, `ingredients` y `benefits`.
- La limpieza del voseo avanzó, pero no quedó cerrada porque persisten textos problemáticos en `messages/es.json`.

---

## 6. Priorización recomendada

### Prioridad 1 — corregir YA
1. **IMG-01** — asset roto `Mora120`
2. **BUG-07 parcial productos** — completar i18n real de `alt`, `ingredients`, `benefits`

### Prioridad 2 — cerrar consistencia editorial
3. **UX-04 parcial** — eliminar voseo restante de `messages/es.json`
4. **ARQ-07 parcial** — mover hardcodes inline restantes al diccionario

### Prioridad 3 — deuda estructural seria
5. **A11Y-11 / SEO-I18N** — `html lang` dinámico
6. **ARQ-01** — desmontar `DictionaryProvider` global
7. **ARQ-02** — desclientificar `/nosotros` y `/contacto`
8. **ARQ-09** — extraer helper compartido para Sanity/fallback

---

## 7. Conclusión

Hubo mejoras REALES. Eso está bien y hay que reconocerlo. Pero no da para vender humo: todavía quedan problemas importantes sin cerrar, un fix crítico de i18n quedó a medias y apareció una regresión nueva de imagen rota.

La lectura correcta no es “todo quedó bien”, sino esta:

> **Se resolvieron varios quick wins con buen impacto, pero la base sigue arrastrando deuda arquitectural e inconsistencias de internacionalización que requieren una segunda pasada seria.**

Es así de simple.
