# Respuesta a Auditoría de Arquitectura — 2026-04-26

## Metadatos
- **Auditoría referenciada:** `audit_architecture_20260426_2148.md`
- **Snapshot de auditoría:** `616af64`
- **Fecha de respuesta:** 2026-04-26
- **Respondido por:** Jair Linan + Claude Sonnet 4.6

---

## Resumen de decisiones

| # | Hallazgo | Decisión | Estado |
|---|---------|----------|--------|
| 1 | I18N Context global fuerza Client Components | Diferido — Fase 3 | ⏳ |
| 2 | `/nosotros` y `/contacto` clientificados | Diferido — Fase 2 | ⏳ |
| 3 | `html lang` fijo en español | Diferido — requiere build test | ⏳ |
| 4 | `yet-another-react-lightbox` eager | **Corregido** | ✅ |
| 5 | Metadata incompleta / sin OG images / sin Twitter | **Corregido** | ✅ |
| 6 | Sitemap incompleto | **Corregido** | ✅ |
| 7 | Strings hardcodeadas en metadata legal | **Corregido** | ✅ |
| 8 | Política de cache poco nítida | Falso positivo de urgencia | ❌ |
| 9 | Duplicación boundary Sanity/fallback | Diferido — Fase 3 | ⏳ |
| 10 | `HelpDrawer` sin focus trap | **Corregido** | ✅ |
| 11 | Botón mobile sin `aria-expanded` | **Corregido** | ✅ |
| 12 | Assets pesados en `/public/imgs` | Falso positivo (Next.js Image) | ❌ |
| 13 | WhyChooseUs/DailyOffer/FeaturedProducts como `"use client"` | Falso positivo — framer-motion | ❌ |
| 14 | Aciertos verificados | Sin acción necesaria | ✅ |

---

## Análisis punto por punto

### 1. [ARQUITECTURA] I18N global vía Context — DIFERIDO (Fase 3)

**Válido.** El `DictionaryProvider` como Context global es contrario al modelo App Router: el servidor carga el diccionario y lo pasa a un Context cliente, lo que arrastra un boundary `"use client"` a toda la sub-árbol.

**Por qué no se corrige ahora:** El fix implica eliminar `DictionaryProvider`, pasar `dict` como prop desde cada Server Component raíz hasta TODOS los consumidores (20+ componentes), y desacoplar `Navbar`, `Footer` y `HelpHub` del Context. Es un refactor de impacto total. Hacerlo en un solo commit sin cobertura de tests es un riesgo innecesario para una fecha de entrega activa.

**Cuando se atacará:** Fase 3, en una rama dedicada, con verificación visual en cada ruta.

---

### 2. [RENDERING] Nosotros y Contacto clientificados — DIFERIDO (Fase 2)

**Válido.** `NosotrosPageContent.tsx` y `ContactoPageContent.tsx` son `"use client"` completos, aunque la mayoría de su contenido es estático.

**Por qué no se corrige ahora:** El refactor correcto es separar el shell Server Component de las islas cliente (tabs, formulario, flipcards). Requiere análisis de cada animación para determinar qué REALMENTE necesita estado de cliente. Es trabajo Fase 2 — medio esfuerzo con alta recompensa, pero no es un quick win.

---

### 3. [SEO] `html lang` fijo en español — DIFERIDO (requiere build test)

**Válido.** Los docs de Next.js 16 en `node_modules/next/dist/docs/01-app/02-guides/internationalization.md:195-199` confirman explícitamente el patrón `<html lang={(await params).lang}>` en `app/[lang]/layout.tsx`. El comentario en el código ("limitación de Next.js App Router") está desactualizado.

**Por qué no se corrige ahora:** La implementación correcta requiere:
1. Remover `<html>/<body>` de `app/layout.tsx`
2. Moverlos a `app/[lang]/layout.tsx` con `lang` dinámico
3. Crear `app/studio/layout.tsx` para que el Sanity Studio no quede sin wrapper

Si `app/layout.tsx` queda sin `<html>/<body>`, Next.js puede lanzar un error en build. Sin poder ejecutar `npm run build` para verificar (constraint del proyecto), el riesgo de introducir un error de producción es inaceptable. Se requiere verificación en un entorno de test antes de proceder.

---

### 4. [BUNDLE] Lightbox importado eager — CORREGIDO ✅

**Archivos modificados:**
- `components/ui/ProductCard.tsx`: import estático → `dynamic(() => import("./ProductLightbox"), { ssr: false })`
- `components/ui/ProductGridCard.tsx`: ídem

**Resultado:** el bundle de `yet-another-react-lightbox` y su CSS se separa en un chunk independiente que solo se descarga cuando el componente se monta. Un usuario que nunca abre una imagen nunca descarga ese código.

---

### 5. [SEO] Metadata incompleta — CORREGIDO ✅

**Archivos modificados:**
- `app/[lang]/page.tsx`: agregado `openGraph.images` + bloque `twitter`
- `app/[lang]/nosotros/page.tsx`: ídem
- `app/[lang]/contacto/page.tsx`: ídem
- `app/[lang]/productos/page.tsx`: ídem
- `app/[lang]/politicas/page.tsx`: agregado `description`, `openGraph` completo, `twitter`, `alternates`
- `app/[lang]/terminos/page.tsx`: ídem

**Nota sobre OG images:** se usa `/imgs/Logo.png` como imagen temporal de fallback. El próximo paso es crear una imagen OG dedicada (1200×630) con diseño de marca. Esto queda como deuda intencional hasta que haya un asset diseñado.

---

### 6. [SEO] Sitemap incompleto — CORREGIDO ✅

**Archivo modificado:** `app/sitemap.ts`

Agregadas las rutas `/politicas` y `/terminos` con prioridad `0.3` y `changeFrequency: "yearly"` ya que son páginas legales que rara vez cambian.

---

### 7. [I18N] Strings hardcodeadas en metadata legal — CORREGIDO ✅

**Archivos modificados:**
- `messages/es.json`: agregadas claves `metadata.privacy.title/description` y `metadata.terms.title/description`
- `messages/en.json`: ídem con traducciones en inglés
- `app/[lang]/politicas/page.tsx`: `generateMetadata` ahora llama `getDictionary` y usa `dict.metadata.privacy.*`
- `app/[lang]/terminos/page.tsx`: ídem con `dict.metadata.terms.*`

**Por qué solo se atacaron los legales:** el hallazgo menciona hardcodes en `ProductosClient.tsx`, `ContactoPageContent.tsx`, `LegalView.tsx` y `Footer.tsx`. Esos casos son parte del problema más grande del Context i18n (hallazgo #1) y se resolverán en Fase 3. Los de metadata legal eran los más aislados y de menor riesgo.

---

### 8. [DATOS] Política de cache poco nítida — FALSO POSITIVO DE URGENCIA ❌

**No es un bug; es diseño intencional con una justificación válida:**

El setup actual tiene dos capas de cache que sirven propósitos distintos:
- `export const revalidate = 60` en el page: controla el ISR — cada 60 segundos Next.js puede regenerar la página estática en el servidor.
- `{ next: { revalidate: 3600 } }` en el fetch: controla el Next.js Data Cache — dentro del mismo window de ISR, si hay múltiples requests paralelos, todos comparten el mismo resultado de Sanity por hasta una hora.

Estas dos capas NO se contradicen: el ISR define cuándo se puede invalidar el HTML; el Data Cache evita que una ráfaga de tráfico golpee Sanity en cada request dentro del mismo periodo. La "opacidad" que señala la auditoría es real como deuda de documentación, pero no como riesgo funcional.

**Acción sugerida (no urgente):** agregar un comentario en el código explicando la intención de cada capa.

---

### 9. [ESTRUCTURA] Duplicación boundary Sanity/fallback — DIFERIDO (Fase 3)

**Válido.** El patrón `sanityReady + try/catch + fallback` está duplicado en `app/[lang]/page.tsx` y `app/[lang]/productos/page.tsx`.

**Por qué no se corrige ahora:** crear un helper compartido require definir la firma genérica correcta (tipado de queries y tipos de retorno distintos) sin introducir complejidad innecesaria. Es trabajo de Fase 3 que se hace junto con la refactorización de la política de cache.

---

### 10. [ACCESSIBILITY] HelpDrawer sin focus trap — CORREGIDO ✅

**Archivo modificado:** `components/ui/HelpDrawer.tsx`

**Cambios:**
- Agregado `useRef<HTMLDivElement>` en el contenedor del drawer
- Agregado `useRef<HTMLButtonElement>` en el botón de cerrar
- `useEffect` que al montar:
  1. Mueve el foco al botón de cerrar (`closeButtonRef.current?.focus()`)
  2. Registra listener para `Escape` → llama `onClose()`
  3. Registra listener para `Tab` / `Shift+Tab` → contiene el foco dentro del drawer (cicla entre el primer y último elemento focusable)
- El listener se limpia en el cleanup del `useEffect`

**Limitación documentada:** no se restaura el foco al trigger original (`HelpHub.button`) porque requeriría pasar un `triggerRef` desde el padre. Se puede agregar en Fase 2 si se reportan problemas reales con lectores de pantalla.

---

### 11. [ACCESSIBILITY] Botón mobile sin `aria-expanded` — CORREGIDO ✅

**Archivo modificado:** `components/layout/Navbar.tsx`

Agregado `aria-expanded={isOpen}` y `aria-controls="mobile-nav"` al botón hamburguesa. Agregado `id="mobile-nav"` al panel móvil animado. El estado `isOpen` ya existía, solo hacía falta exponerlo semánticamente.

---

### 12. [IMÁGENES] Assets pesados en `/public/imgs` — FALSO POSITIVO PARCIAL ❌

**El hallazgo confunde el peso en disco con el peso servido.**

Next.js `<Image>` hace conversión automática a WebP/AVIF en el momento del request, con compresión adaptativa y dimensiones ajustadas al viewport. Un PNG de 9MB en disco puede servirse como WebP de 120KB al browser. El costo real del PNG en disco es solo espacio de repo/CDN, no performance de usuario.

**Lo que sería un problema real (y no se detectó):** usos de `<img>` nativo sin pasar por `next/image`. Todos los assets del catálogo están servidos a través de `<Image>` de Next.js, por lo tanto la "optimización" ya está aplicada en runtime.

**Acción recomendada (no urgente):** comprimir los assets legacy (`Envase.png`, `Tomate-Arbol.png`) para reducir carga de almacenamiento, pero sin impacto en performance de usuario.

---

### 13. [RENDERING] WhyChooseUs/DailyOffer/FeaturedProducts como `"use client"` — FALSO POSITIVO ❌

**La auditoría describe un problema que ya fue parcialmente resuelto y cuyo remanente es una necesidad técnica real, no una negligencia.**

Estado actual verificado:
- Los tres componentes reciben `dict` como prop — NO usan `useDictionary()` ni Context
- Los tres usan `m.div` de framer-motion con `whileInView`, `initial`, `animate` y `transition`

`whileInView` de framer-motion requiere acceso al DOM via `IntersectionObserver` y al estado de animación, lo que hace OBLIGATORIO `"use client"`. No hay forma de ejecutar estas animaciones en un Server Component sin reemplazar framer-motion por animaciones CSS puras (que es una decisión de diseño separada, no un fix).

La mitad del hallazgo ya fue corregida: la dependencia de Context fue eliminada y `dict` ya se pasa por props. Lo que queda (`"use client"`) es un requerimiento de la librería de animaciones, no un error de arquitectura.

---

### 14. [INFO] Aciertos verificados — SIN ACCIÓN ✅

Confirmado. Estos patrones se mantienen:
- `getDictionary` usa `React.cache()` — correcto y eficiente
- `proxy.ts` sigue convención Next.js 16
- `useCdn: true` en el client de Sanity — apropiado para contenido editorial
- La API de contacto sanitiza HTML y no loguea el objeto error completo

---

## Archivos modificados en esta respuesta

| Archivo | Cambio |
|---------|--------|
| `components/ui/ProductCard.tsx` | Lightbox → `dynamic` |
| `components/ui/ProductGridCard.tsx` | Lightbox → `dynamic` |
| `components/ui/HelpDrawer.tsx` | Focus trap + Escape key |
| `components/layout/Navbar.tsx` | `aria-expanded` + `aria-controls` + `id="mobile-nav"` |
| `app/sitemap.ts` | Agregadas rutas `/politicas` y `/terminos` |
| `app/[lang]/page.tsx` | OG image + Twitter card |
| `app/[lang]/nosotros/page.tsx` | OG image + Twitter card |
| `app/[lang]/contacto/page.tsx` | OG image + Twitter card |
| `app/[lang]/productos/page.tsx` | OG image + Twitter card |
| `app/[lang]/politicas/page.tsx` | Metadata completa desde diccionario |
| `app/[lang]/terminos/page.tsx` | Metadata completa desde diccionario |
| `messages/es.json` | Claves `metadata.privacy.*` y `metadata.terms.*` |
| `messages/en.json` | Ídem en inglés |
