# Auditoría de Arquitectura — 2026-04-26 21:48

## Metadatos
- **Tipo:** Arquitectura
- **Fecha:** 2026-04-26 21:48:05
- **Snapshot de referencia:** `616af64213cf4c090501b19df284557399240fc8`
- **Fecha snapshot:** `2026-04-26 20:59:06 -0500`
- **Auditor:** GPT-5.4 + skill `software-architecture-auditor`
- **Versión Next.js:** `16.2.3`
- **Archivos en scope:** 51
- **Dependencias totales:** 25
- **Nota:** no se creó commit baseline porque no fue solicitado explícitamente por el usuario.

## Resumen Ejecutivo
- **Estado general:** la base está bastante mejor que en auditorías previas en `LazyMotion + m`, `proxy.ts`, schema Zod i18n y sanitización del route handler.
- **Problema dominante:** la arquitectura de i18n sigue empujando demasiada UI al cliente por el `DictionaryProvider` global en `app/[lang]/layout.tsx`.
- **Riesgo principal de performance:** exceso de Client Components + import eager de `yet-another-react-lightbox` + imágenes pesadas en `/public/imgs`.
- **Riesgo principal de SEO/a11y:** `html lang` incorrecto en `/en`, metadata incompleta en varias rutas, sitemap incompleto y overlays sin focus management robusto.

## Inventario Tecnológico

### Framework principal
- **Next.js:** `16.2.3`
- **React / React DOM:** `19.2.4`
- **Tailwind:** `4.2.2`

### UI / animación
- `framer-motion@12.38.0`
- `yet-another-react-lightbox@3.31.0`

### Formularios / validación
- `react-hook-form@7.72.1`
- `@hookform/resolvers@5.2.2`
- `zod@4.3.6`

### CMS / datos
- `next-sanity@12.2.2`
- `sanity@5.20.0`
- `@sanity/image-url@2.1.1`
- `@sanity/vision@5.20.0`

### Terceros
- `@next/third-parties@16.2.3`
- `resend@6.10.0`

### Dependencias desactualizadas verificadas
Se verificó con `npm outdated --json`. Hay updates menores/patch disponibles en varias librerías clave:
- `next` `16.2.3` → `16.2.4`
- `react` `19.2.4` → `19.2.5`
- `next-sanity` `12.2.2` → `12.3.0`
- `react-hook-form` `7.72.1` → `7.74.0`
- `resend` `6.10.0` → `6.12.2`
- `sanity` / `@sanity/vision` `5.20.0` → `5.22.0`

## Mapa de Rutas y Rendering
| Ruta | Estrategia actual | Evidencia |
|---|---|---|
| `/` | redirección por `proxy.ts` | `proxy.ts:21-48` |
| `/{lang}` | SSG por `generateStaticParams` + ISR `revalidate=60` | `app/[lang]/layout.tsx:12-14`, `app/[lang]/page.tsx:18` |
| `/{lang}/productos` | SSG + ISR `revalidate=60`; filtrado totalmente client-side | `app/[lang]/productos/page.tsx:10`, `app/[lang]/productos/ProductosClient.tsx:1-437` |
| `/{lang}/nosotros` | ruta estática, pero la página completa cae en Client Component | `app/[lang]/nosotros/page.tsx:32-35`, `components/sections/NosotrosPageContent.tsx:1` |
| `/{lang}/contacto` | ruta estática, pero la página completa cae en Client Component | `app/[lang]/contacto/page.tsx:32-35`, `components/sections/ContactoPageContent.tsx:1` |
| `/{lang}/politicas` | estática | `app/[lang]/politicas/page.tsx:17-104` |
| `/{lang}/terminos` | estática | `app/[lang]/terminos/page.tsx:17-104` |
| `/api/contact` | request-time Route Handler | `app/api/contact/route.ts:162-219` |
| `/studio/[[...tool]]` | client-only con `ssr:false` | `app/studio/[[...tool]]/page.tsx` |

## Hallazgos Detallados

### 1) [ARQUITECTURA] I18N global vía Context fuerza demasiados Client Components
**Severidad:** 🟠 HIGH  
**Estado actual:** `DictionaryProvider` envuelve toda la app en `app/[lang]/layout.tsx:63-71`, y 20+ componentes consumen `useDictionary()`.  
**Problema:** estás llevando datos del servidor al cliente por Context, lo contrario de lo que recomienda App Router para contenido traducido. Next 16 documenta que los diccionarios cargados en layouts/pages server **no impactan** el bundle cliente y muestra `html lang={(await params).lang}` dentro de `app/[lang]/layout.tsx` (`node_modules/next/dist/docs/01-app/02-guides/internationalization.md:179-199`).  
**Alternativa:** pasar `dict` como prop desde Server Components y dejar Client Components solo donde haya estado/eventos reales.  
**Impacto:** Alto  
**Esfuerzo:** Medio/Alto  
**Relación impacto/esfuerzo:** ALTÍSIMA.

### 2) [RENDERING] `/nosotros` y `/contacto` están clientificados casi completos
**Severidad:** 🟠 HIGH  
**Estado actual:** `NosotrosPageContent.tsx` y `ContactoPageContent.tsx` son `"use client"` completos (`components/sections/NosotrosPageContent.tsx:1`, `components/sections/ContactoPageContent.tsx:1`).  
**Problema:** páginas mayormente estáticas bajan JS innecesario solo por animaciones y consumo del diccionario.  
**Alternativa:** shell Server Component + islas client para tabs, formulario, carousel/flipcards si realmente lo requieren.  
**Impacto:** Alto  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** muy buena.

### 3) [SEO] `html lang` sigue fijo en español para toda la app
**Severidad:** 🟠 HIGH  
**Estado actual:** `app/layout.tsx:23-25` renderiza `<html lang="es">` siempre.  
**Problema:** la ruta `/en` entrega markup con idioma incorrecto; eso afecta accesibilidad, SEO semántico y lectores de pantalla.  
**Alternativa:** mover `<html>` y `<body>` al layout segmentado `app/[lang]/layout.tsx` como recomienda la guía oficial (`internationalization.md:185-199`).  
**Impacto:** Alto  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** excelente.

### 4) [BUNDLE] `yet-another-react-lightbox` se importa eager en cada card
**Severidad:** 🟠 HIGH  
**Estado actual:** `ProductCard.tsx` y `ProductGridCard.tsx` montan `ProductLightbox`, que importa `yet-another-react-lightbox` y su CSS desde el tope (`components/ui/ProductLightbox.tsx:3-4`, `components/ui/ProductCard.tsx:136-140`, `components/ui/ProductGridCard.tsx:104-108`).  
**Problema:** el costo del lightbox entra en la experiencia aunque el usuario nunca abra una imagen.  
**Alternativa:** `next/dynamic` o import diferido al abrir el modal.  
**Impacto:** Alto  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** muy alta.

### 5) [SEO] Metadata incompleta en home, legales y OG images
**Severidad:** 🟠 HIGH  
**Estado actual:**
- home solo tiene `title`, `description`, `keywords`, `alternates` (`app/[lang]/page.tsx:22-37`)
- legales solo tienen `title` + `robots` (`app/[lang]/politicas/page.tsx:9-15`, `app/[lang]/terminos/page.tsx:9-15`)
- `nosotros`, `contacto`, `productos` tienen `openGraph` sin `images` (`app/[lang]/nosotros/page.tsx:16-21`, `app/[lang]/contacto/page.tsx:16-21`, `app/[lang]/productos/page.tsx:24-29`)
- no se encontraron bloques `twitter` en `app/**`.  
**Problema:** previews sociales pobres y SEO inconsistente por ruta.  
**Alternativa:** normalizar metadata compartida por tipo de página e incluir `openGraph.images`, `twitter`, `description` y canonical en TODAS las indexables.  
**Impacto:** Alto  
**Esfuerzo:** Bajo/Medio  
**Relación impacto/esfuerzo:** excelente quick win.

### 6) [SEO] Sitemap incompleto respecto a rutas indexables
**Severidad:** 🟡 MED  
**Estado actual:** `app/sitemap.ts:11-16` solo incluye home, productos, nosotros y contacto. `politicas` y `terminos` quedan afuera aunque están indexables (`robots: { index: true, follow: true }`).  
**Problema:** páginas legales públicas no se anuncian al sitemap.  
**Alternativa:** agregarlas explícitamente al arreglo de rutas estáticas.  
**Impacto:** Medio  
**Esfuerzo:** Bajo  
**Relación impacto/esfuerzo:** altísima.

### 7) [I18N] Persisten strings hardcodeadas con bifurcaciones `lang === "es"`
**Severidad:** 🟡 MED  
**Estado actual:** se encontraron hardcodes en `ProductosClient.tsx`, `ContactoPageContent.tsx`, `LegalView.tsx`, `Footer.tsx`, y títulos de metadata legales.  
**Problema:** aumenta deuda de traducción, dificulta QA y rompe la regla de fuente única en el diccionario.  
**Alternativa:** mover todos esos textos a `messages/es.json` y `messages/en.json`.  
**Impacto:** Medio  
**Esfuerzo:** Bajo/Medio  
**Relación impacto/esfuerzo:** muy buena.

### 8) [DATOS] Política de cache y revalidate poco nítida
**Severidad:** 🟡 MED  
**Estado actual:** las páginas usan `export const revalidate = 60` (`app/[lang]/page.tsx:18`, `app/[lang]/productos/page.tsx:10`), mientras los fetches a Sanity usan `{ next: { revalidate: 3600 } }` (`app/[lang]/page.tsx:59-60`, `app/[lang]/productos/page.tsx:53`).  
**Problema:** la intención de cache queda opaca y difícil de razonar.  
**Alternativa:** definir una política clara por tipo de dato: contenido editorial, catálogo, testimonials, fallback estático.  
**Impacto:** Medio  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** buena.

### 9) [ESTRUCTURA] Duplicación de boundary Sanity/fallback
**Severidad:** 🟡 MED  
**Estado actual:** home y productos repiten el patrón `sanityReady + try/catch + fallback estático` (`app/[lang]/page.tsx:48-68`, `app/[lang]/productos/page.tsx:46-57`).  
**Problema:** cuando cambie la política de CMS o fallback, tenés que tocar varios puntos.  
**Alternativa:** helper server-side compartido para resolver `Sanity or static fallback`.  
**Impacto:** Medio  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** buena.

### 10) [ACCESSIBILITY] `HelpDrawer` no implementa focus trap ni restore focus
**Severidad:** 🟡 MED  
**Estado actual:** tiene `role="dialog"` y `aria-modal` (`components/ui/HelpDrawer.tsx:51-53`), pero no hay foco inicial, trap, Escape ni retorno del foco al trigger.  
**Problema:** overlay usable visualmente, pero incompleto para teclado y lectores de pantalla.  
**Alternativa:** manejar foco al abrir/cerrar, Escape y contención del tab-focus.  
**Impacto:** Medio  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** muy buena.

### 11) [ACCESSIBILITY] Botón del menú mobile sin `aria-expanded` ni `aria-controls`
**Severidad:** 🟢 LOW  
**Estado actual:** el botón solo tiene `aria-label` (`components/layout/Navbar.tsx:89-93`).  
**Problema:** falta estado semántico para tecnologías asistivas.  
**Alternativa:** agregar `aria-expanded`, `aria-controls` y un `id` al panel móvil.  
**Impacto:** Bajo/Medio  
**Esfuerzo:** Bajo  
**Relación impacto/esfuerzo:** excelente.

### 12) [IMÁGENES] Hay assets desproporcionadamente pesados en `public/imgs`
**Severidad:** 🟡 MED  
**Estado actual:** se verificaron archivos enormes:
- `Envase.png` → `9,000,168 bytes`
- `Tomate-Arbol.png` → `1,904,217 bytes`
- varios PNG de catálogo entre `175 KB` y `293 KB`.  
**Problema:** aunque no todos carguen above-the-fold, el inventario de assets ya muestra oportunidades claras de compresión/conversión.  
**Alternativa:** convertir PNG pesados a WebP/AVIF, revisar dimensiones reales y optimizar los packshots legacy.  
**Impacto:** Medio  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** muy buena.

### 13) [RENDERING] Secciones decorativas siguen siendo client aunque ya reciben `dict` por props
**Severidad:** 🟡 MED  
**Estado actual:** `WhyChooseUs.tsx`, `DailyOffer.tsx` y `FeaturedProducts.tsx` ya aceptan `dict` por props, pero continúan con `"use client"` (`components/sections/WhyChooseUs.tsx:1`, `DailyOffer.tsx:1`, `FeaturedProducts.tsx:1`).  
**Problema:** ahí tenés quick wins obvios para recortar hidratación porque el acoplamiento con Context ya fue parcialmente eliminado.  
**Alternativa:** convertir wrapper a Server Component y encapsular solo microinteracciones si realmente hacen falta.  
**Impacto:** Medio  
**Esfuerzo:** Medio  
**Relación impacto/esfuerzo:** alta.

### 14) [INFO] Aciertos verificados que conviene MANTENER
**Severidad:** ℹ️ INFO  
**Estado actual:**
- `getDictionary` usa `React.cache()` (`lib/i18n/index.ts:16-19`)
- `proxy.ts` sigue la convención correcta de Next 16
- `@sanity/client` usa `useCdn: true` (`sanity/lib/client.ts:5-10`), razonable para contenido editorial
- la API de contacto ya sanitiza HTML y evita loguear el objeto error completo (`app/api/contact/route.ts:40-48`, `213-216`)  
**Problema:** ninguno; esto está bien encaminado.  
**Alternativa:** sostener el patrón.  
**Impacto:** Bajo positivo  
**Esfuerzo:** Bajo  
**Relación impacto/esfuerzo:** mantener, no tocar sin motivo.

## Clasificación de Client Components

### Necesarios
- `Navbar.tsx`
- `LanguageSwitcher.tsx`
- `HelpHub.tsx`
- `HelpDrawer.tsx`
- `FaqView.tsx`
- `HeroCarousel.tsx`
- `TestimonialCarousel.tsx`
- `ContactForm.tsx`
- `ProductCard.tsx`
- `ProductGridCard.tsx`
- `ProductLightbox.tsx`
- `ProductLineRow.tsx`
- `PulpaFruitGrid.tsx`
- `MisionVisionTabs.tsx`
- `AnimatedWhatsAppButton.tsx`
- `ScrollProgress.tsx`
- `ProductosClient.tsx`

### Probablemente innecesarios o reducibles
- `WhyChooseUs.tsx`
- `DailyOffer.tsx`
- `FeaturedProducts.tsx`
- `ProductCategories.tsx`
- `ContactoPageContent.tsx`
- `NosotrosPageContent.tsx`
- `drawer-views/LegalView.tsx`
- `drawer-views/ContactView.tsx`

## Top 5 Quick Wins
1. **Mover `<html>` y `<body>` a `app/[lang]/layout.tsx`** para corregir `lang` por locale.
2. **Completar metadata SEO** de home/legal + OG images + Twitter cards.
3. **Agregar `politicas` y `terminos` al sitemap**.
4. **Lazy-load del lightbox** en vez de importarlo eager en cada card.
5. **Quitar `"use client"` de wrappers decorativos** (`WhyChooseUs`, `DailyOffer`, `FeaturedProducts`) y empezar a pasar `dict` por props en más secciones.

## Roadmap sugerido

### Fase 1 (inmediato, <1 día)
- corregir `html lang`
- completar metadata faltante
- agregar legales al sitemap
- agregar `aria-expanded` / `aria-controls` al menú mobile

### Fase 2 (corto plazo, <1 semana)
- convertir `ContactoPageContent` y `NosotrosPageContent` en shells server con islas client
- lazy-load del lightbox
- mover hardcodes `lang === "es"` al diccionario
- focus management real para `HelpDrawer`

### Fase 3 (largo plazo, >1 semana)
- desmontar progresivamente la arquitectura de i18n basada en Context global
- centralizar capa de fetch Sanity + fallback estático
- redefinir política única de cache / revalidate
- optimizar inventario de assets pesados y revisar si algunas animaciones pueden salir del cliente

## Conclusión
Dejame ser brutalmente honesto, pero porque ME IMPORTA que el proyecto crezca bien: la base no está mal, pero todavía arrastra una decisión arquitectural que contamina todo el árbol — **usar Context cliente para traducciones server-side**. Eso te encarece rendering, bundle y mantenibilidad. Si corregís ESE cimiento, el resto cae por gravedad: menos JS, páginas más limpias, boundaries más claros y un App Router realmente aprovechado.
