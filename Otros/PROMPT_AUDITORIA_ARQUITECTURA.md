# Prompt de Auditoría de Arquitectura y Optimización — Mas Cerca AP

> Versión: 1.0 | Fecha: 2026-04-19
> Usar cuando se quiera evaluar si el proyecto está construido de la forma más óptima
> o si hay oportunidades de mejora tecnológica o estructural.

---

Sos un arquitecto de software senior especializado en aplicaciones Next.js con 15 años de experiencia. Tu tarea es hacer una auditoría de arquitectura y performance del proyecto en `/home/server/Escritorio/mascercaap/mas-cerca-ap/`.

**IMPORTANTE**: Antes de comenzar, leer estos documentos en orden:
1. `LECCIONES_APRENDIDAS.md` — errores anteriores y reglas del proyecto
2. `node_modules/next/dist/docs/01-app/index.md` — entender la versión exacta de Next.js instalada
3. `package.json` — inventario completo de dependencias y sus versiones

---

## METODOLOGÍA

### PASO 1 — Inventario tecnológico

Leer `package.json` completo y listar:
- Framework principal y versión
- Librerías de UI y animación (con tamaño estimado de bundle)
- Librerías de formularios y validación
- CMS y cliente de datos
- Herramientas de análisis y terceros
- Dependencias de desarrollo

Para cada dependencia clave, evaluar:
1. ¿Es la versión más reciente estable?
2. ¿Tiene alternativas más livianas que cumplan el mismo rol?
3. ¿Se justifica su presencia dado el uso actual en el código?

### PASO 2 — Análisis de rendering strategy

Mapear cada ruta del proyecto con su estrategia de rendering:

```
app/[lang]/page.tsx          → SSR/ISR/SSG/CSR?
app/[lang]/productos/page.tsx → SSR/ISR/SSG/CSR?
app/[lang]/nosotros/page.tsx  → SSR/ISR/SSG/CSR?
app/[lang]/contacto/page.tsx  → SSR/ISR/SSG/CSR?
```

Para cada ruta, determinar:
- ¿Necesita datos dinámicos en runtime? ¿O puede ser estática?
- ¿Tiene `export const dynamic` configurado? ¿Debería?
- ¿El `revalidate` es el correcto para la frecuencia de cambio del contenido?
- ¿Hay alguna ruta que debería ser `force-static` pero no lo es?

Buscar si el proyecto podría beneficiarse de `output: 'export'` (static export) dado que el contenido es relativamente estático.

### PASO 3 — Análisis de Server Components vs Client Components

Para CADA componente del proyecto, clasificar:
- **RSC (Server Component)**: puede renderizar sin JS en el cliente
- **CC necesario**: usa hooks, eventos, browser APIs — DEBE ser "use client"
- **CC innecesario**: es "use client" solo por herencia o por Context — candidato a convertir

Preguntas específicas a responder:
1. ¿Cuántos componentes son "use client" innecesariamente?
2. ¿El patrón de Context (DictionaryProvider) es la mejor opción para i18n en este proyecto o hay alternativas más livianas?
3. ¿Hay componentes que podrían aplicar el patrón "Server Component shell + Client island"?

Verificar contra LECCIONES_APRENDIDAS.md que se cumplan las reglas de:
- `m` (no `motion`) en todos los componentes
- dict como prop donde corresponde, no via Context

### PASO 4 — Análisis de bundle y JavaScript

Inspeccionar el bundle JS buscando:

**4A — Dependencias pesadas y alternativas**
```
framer-motion    → ¿Se usa LazyMotion + domAnimation correctamente? ¿Cuántos KB?
                 → Alternativa: CSS animations para animaciones simples
react-hook-form  → ¿Justificado para un solo formulario? 
                 → Alternativa: uso directo con useState si es simple
zod              → ¿Está en el bundle del cliente? Debería ser solo servidor
@sanity/client   → ¿Se importa en el cliente? Debería ser solo en Server Components
resend           → ¿Solo se usa en API route? ✓
```

**4B — Code splitting**
- ¿Hay rutas o componentes que se beneficiarían de `next/dynamic` con lazy loading?
- ¿El HeroCarousel (componente más pesado, ~50KB de imágenes + animaciones) se carga eagerly en todas las páginas?
- ¿Hay imports que están en el bundle global cuando deberían ser por-ruta?

**4C — Tamaño total del bundle**
Identificar cuáles son los 5 imports más pesados del proyecto y evaluar si se pueden reducir.

### PASO 5 — Análisis de data fetching

Para cada fuente de datos, evaluar la estrategia:

**Sanity CMS:**
- ¿Las queries están optimizadas (solo los campos que se usan)?
- ¿Se usa `{ next: { revalidate: N } }` correctamente en cada fetch?
- ¿El tiempo de revalidation es el correcto para la frecuencia de cambio del contenido?
- ¿Debería usarse Sanity CDN (useCdn: true) o el API directo según el caso?
- ¿Hay queries que se podrían combinar en una sola para reducir round-trips?

**Diccionario i18n:**
- ¿`getDictionary` usa `React.cache()` para deduplicar entre layout y páginas?
- ¿Hay claves no usadas en los JSON de mensajes (huérfanas)?
- ¿El tamaño total de los JSON es razonable?

**Datos estáticos (`data/*.ts`):**
- ¿Se importan datos estáticos en componentes "use client" (aumentando el bundle)?
- ¿Deberían estar en Sanity en lugar de archivos .ts?

### PASO 6 — Análisis de imágenes y media

Revisar todas las imágenes del proyecto:
- ¿Todas usan `next/image`? (ningún `<img>` nativo)
- ¿Las imágenes above-the-fold tienen `priority` y `loading="eager"`?
- ¿Los `sizes` son correctos para cada contexto (evitar over-fetching)?
- ¿El formato WebP es el más eficiente o hay formatos más modernos disponibles (AVIF)?
- ¿Hay imágenes que podrían beneficiarse de `next/image` con `quality` reducido?
- ¿El tamaño de los archivos en `/public/imgs/` es razonable? ¿Hay imágenes >500KB?

### PASO 7 — Análisis de SEO y metadata

- ¿Cada página tiene `generateMetadata` con title, description y og:tags?
- ¿El sitemap incluye todas las rutas?
- ¿El JSON-LD (Organization schema) es correcto y completo?
- ¿`robots.txt` existe y está configurado correctamente?
- ¿Las páginas tienen `canonical` URL configurada?
- ¿El `lang` del documento HTML refleja el idioma actual (bug conocido: ver LECCIONES_APRENDIDAS.md)?

### PASO 8 — Análisis de arquitectura i18n

Evaluar si el sistema de internacionalización actual es óptimo:
- ¿El patrón `app/[lang]/` con `DictionaryProvider` Context es el más eficiente?
- ¿Hay alternativas más livianas para i18n en Next.js 16? (ej: `next-intl`, `next-i18next`)
- ¿El tamaño de los archivos JSON de traducción es aceptable?
- ¿Hay claves que deberían venir de Sanity en lugar de JSON estáticos?
- ¿El LanguageSwitcher funciona correctamente en todas las rutas?

### PASO 9 — Análisis de accesibilidad estructural

Más allá de los aria-labels (ya cubiertos en PROMPT_AUDITORIA.md), evaluar:
- ¿La jerarquía de headings (h1, h2, h3) es semánticamente correcta?
- ¿El orden de tab-focus es lógico?
- ¿Hay elementos interactivos sin keyboard support?
- ¿El sitio funciona con JavaScript deshabilitado (degradation graceful)?
- ¿Los colores cumplen WCAG AA en todos los contextos?

### PASO 10 — Análisis de estructura del proyecto

Evaluar si la estructura de archivos y carpetas es la más mantenible:
- ¿La separación entre `components/ui/`, `components/sections/` y `components/layout/` es clara?
- ¿Hay componentes que deberían estar en una carpeta diferente?
- ¿`lib/` está bien organizado? ¿Hay utilidades que deberían estar en `hooks/`?
- ¿La separación entre datos estáticos (`data/`) y CMS (Sanity) es clara?
- ¿El Sanity Studio en `/studio` está correctamente aislado del resto de la app?
- ¿La configuración de TypeScript (`tsconfig.json`) está optimizada?

---

## FORMATO DE REPORTE

### Para cada hallazgo:
```
[TIPO] Área → Descripción específica
Estado actual: [qué hay hoy]
Problema: [por qué es subóptimo]
Alternativa: [qué se podría hacer en cambio]
Impacto: Alto / Medio / Bajo
Esfuerzo: Alto / Medio / Bajo (para implementar el cambio)
Relación impacto/esfuerzo: [vale la pena o no]
```

Tipos: ARQUITECTURA | PERFORMANCE | BUNDLE | RENDERING | I18N | SEO | DATOS | ESTRUCTURA

### Resumen final:

1. **Tabla de hallazgos** por área con conteo y severidad
2. **Top 5 mejoras de mayor impacto/menor esfuerzo** (quick wins)
3. **Roadmap sugerido** en 3 fases:
   - Fase 1 (inmediato, <1 día): Quick wins sin cambios arquitecturales
   - Fase 2 (corto plazo, <1 semana): Cambios de arquitectura moderados
   - Fase 3 (largo plazo, >1 semana): Refactors profundos o cambios de stack

---

## PREGUNTAS CLAVE A RESPONDER

Al final del análisis, responder estas preguntas explícitamente:

1. **¿Next.js 16 es la elección correcta para este proyecto?** ¿O sería mejor Astro, Nuxt, Remix, o SvelteKit dada la naturaleza semi-estática del sitio?

2. **¿Framer Motion está justificado?** ¿O las animaciones podrían hacerse con CSS puro/Tailwind, eliminando ~30KB del bundle?

3. **¿Sanity es el CMS correcto?** ¿O sería más simple usar archivos Markdown/MDX, un headless CMS más simple, o incluso solo los datos estáticos de `data/`?

4. **¿La arquitectura de i18n es óptima?** ¿El patrón `app/[lang]/` + Context es lo mejor, o una librería dedicada haría el trabajo con menos overhead?

5. **¿El proyecto debería deployarse como static export?** El contenido es relativamente estático (productos, testimonios, textos). Un static export eliminaría toda la complejidad de SSR y server costs.

6. **¿Hay deuda técnica acumulada** que valga la pena pagar antes de seguir agregando features?

---

## CONTEXTO DEL PROYECTO (leer antes de auditar)

- **Tipo**: Landing page + catálogo de productos para una empresa colombiana de jugos naturales
- **Audiencia**: Negocios B2B (restaurantes, cafeterías) y consumidores finales
- **Contenido**: Relativamente estático (productos, nosotros, contacto) con datos de CMS
- **Idiomas**: Español (principal) e Inglés
- **Estado actual**: Proyecto en desarrollo activo, aún no en producción
- **Código base**: ~40 componentes, 4 páginas, 1 API route, integración Sanity Studio
- **Historial de problemas**: Ver `LECCIONES_APRENDIDAS.md` — especialmente causas de lentitud y bugs recurrentes

---

## EXCLUSIONES

- No auditar `node_modules/`, `.next/`, `sanity/` (schemas del CMS — fuera de alcance)
- No auditar `scripts/migrate-to-sanity.ts` (script one-time, fuera de ciclo de vida)
- No repetir hallazgos ya documentados en `LECCIONES_APRENDIDAS.md` a menos que sigan sin resolver
