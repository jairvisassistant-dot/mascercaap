---
name: software-architecture-auditor
description: >
  Auditoría de arquitectura, performance y stack tecnológico de aplicaciones Next.js.
  Evalúa decisiones de diseño, tamaño de bundle, estrategia de rendering y deuda
  técnica arquitectural. Trigger: "auditar arquitectura", "revisar performance",
  "analizar bundle", "evaluar stack", "revisar renderizado", "auditoría de optimización".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Solicitud de "auditar arquitectura" o "revisar el stack"
- Análisis de "performance" o "bundle size"
- Evaluación de "estrategia de rendering" (SSR, SSG, ISR, CSR)
- Revisión de decisiones técnicas (Next.js vs otro framework, CMS elegido, etc.)
- Evaluación de deuda técnica a nivel arquitectural
- Solicitud de "quick wins" o "roadmap de mejoras"

## Exclusiones (NO auditar)

```
node_modules/              → excluir
.next/                     → excluir
public/                    → solo verificar robots.txt
.env.local                 → excluir (seguridad)
sanity/schemas/            → excluir (CMS, fuera de alcance)
scripts/migrate*.ts       → exclude (script one-time)
LECCIONES_APRENDIDAS.md    → SOLO leer para contexto, no repetir hallazgos ya documentados
```

---

## Metodología de Auditoría — 10 Pasos

### PASO 1 — Inventario Tecnológico

Leer `package.json` completo y listar:

```
Framework principal y versión
Librerías de UI y animación (con tamaño estimado de bundle)
Librerías de formularios y validación
CMS y cliente de datos
Herramientas de análisis y terceros
Dependencias de desarrollo
```

Para cada dependencia clave, evaluar:
1. ¿Es la versión más reciente estable?
2. ¿Tiene alternativas más livianas que cumplan el mismo rol?
3. ¿Se justifica su presencia dado el uso actual en el código?

### PASO 2 — Análisis de Estrategia de Rendering

Mapear cada ruta del proyecto con su estrategia:

```
app/[lang]/page.tsx              → SSR / ISR / SSG / CSR?
app/[lang]/productos/page.tsx    → SSR / ISR / SSG / CSR?
app/[lang]/nosotros/page.tsx     → SSR / ISR / SSG / CSR?
app/[lang]/contacto/page.tsx     → SSR / ISR / SSG / CSR?
```

Para cada ruta, determinar:
- ¿Necesita datos dinámicos en runtime? ¿O puede ser estática?
- ¿Tiene `export const dynamic` configurado? ¿Debería?
- ¿El `revalidate` es el correcto para la frecuencia de cambio del contenido?
- ¿Hay alguna ruta que debería ser `force-static` pero no lo es?
- ¿El proyecto podría beneficiarse de `output: 'export'` (static export) dado que el contenido es relativamente estático?

### PASO 3 — Análisis de Server Components vs Client Components

Para CADA componente del proyecto, clasificar:
- **RSC (Server Component)**: puede renderizar sin JS en el cliente
- **CC necesario**: usa hooks, eventos, browser APIs — DEBE ser "use client"
- **CC innecesario**: es "use client" solo por herencia o por Context — candidato a convertir

Preguntas específicas a responder:
1. ¿Cuántos componentes son "use client" innecesariamente?
2. ¿El patrón de Context (DictionaryProvider) es la mejor opción para i18n en este proyecto o hay alternativas más livianas?
3. ¿Hay componentes que podrían aplicar el patrón "Server Component shell + Client island"?

Verificar que se cumplan las reglas de:
- `m` (no `motion`) en todos los componentes
- dict como prop donde corresponde, no via Context

### PASO 4 — Análisis de Bundle y JavaScript

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
- ¿El HeroCarousel (componente más pesado) se carga eagerly en todas las páginas?
- ¿Hay imports que están en el bundle global cuando deberían ser por-ruta?

**4C — Tamaño total del bundle**
Identificar cuáles son los 5 imports más pesados del proyecto y evaluar si se pueden reducir.

### PASO 5 — Análisis de Data Fetching

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

### PASO 6 — Análisis de Imágenes y Media

Revisar todas las imágenes del proyecto:
- ¿Todas usan `next/image`? (ningún `<img>` nativo)
- ¿Las imágenes above-the-fold tienen `priority` y `loading="eager"`?
- ¿Los `sizes` son correctos para cada contexto (evitar over-fetching)?
- ¿El formato WebP es el más eficiente o hay formatos más modernos disponibles (AVIF)?
- ¿Hay imágenes que podrían beneficiarse de `next/image` con `quality` reducido?
- ¿El tamaño de los archivos en `/public/imgs/` es razonable? ¿Hay imágenes >500KB?

### PASO 7 — Análisis de SEO y Metadata

- ¿Cada página tiene `generateMetadata` con title, description y og:tags?
- ¿El sitemap incluye todas las rutas?
- ¿El JSON-LD (Organization schema) es correcto y completo?
- ¿`robots.txt` existe y está configurado correctamente?
- ¿Las páginas tienen `canonical` URL configurada?
- ¿El `lang` del documento HTML refleja el idioma actual? (bug conocido en LECCIONES_APRENDIDAS.md)

### PASO 8 — Análisis de Arquitectura i18n

Evaluar si el sistema de internacionalización actual es óptimo:
- ¿El patrón `app/[lang]/` con `DictionaryProvider` Context es el más eficiente?
- ¿Hay alternativas más livianas para i18n en Next.js 16? (ej: `next-intl`, `next-i18next`)
- ¿El tamaño de los archivos JSON de traducción es aceptable?
- ¿Hay claves que deberían venir de Sanity en lugar de JSON estáticos?
- ¿El LanguageSwitcher funciona correctamente en todas las rutas?

### PASO 9 — Análisis de Accesibilidad Estructural

Más allá de los aria-labels (ya cubiertos en la auditoría de código), evaluar:
- ¿La jerarquía de headings (h1, h2, h3) es semánticamente correcta?
- ¿El orden de tab-focus es lógico?
- ¿Hay elementos interactivos sin keyboard support?
- ¿El sitio funciona con JavaScript deshabilitado (graceful degradation)?
- ¿Los colores cumplen WCAG AA en todos los contextos?

### PASO 10 — Análisis de Estructura del Proyecto

Evaluar si la estructura de archivos y carpetas es la más mantenible:
- ¿La separación entre `components/ui/`, `components/sections/` y `components/layout/` es clara?
- ¿Hay componentes que deberían estar en una carpeta diferente?
- ¿`lib/` está bien organizado? ¿Hay utilidades que deberían estar en `hooks/`?
- ¿La separación entre datos estáticos (`data/`) y CMS (Sanity) es clara?
- ¿El Sanity Studio en `/studio` está correctamente aislado del resto de la app?
- ¿La configuración de TypeScript (`tsconfig.json`) está optimizada?

---

## Formato de Reporte

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

**Tipos:** ARQUITECTURA | PERFORMANCE | BUNDLE | RENDERING | I18N | SEO | DATOS | ESTRUCTURA

### Resumen final:

1. **Tabla de hallazgos** por área con conteo y severidad
2. **Top 5 mejoras de mayor impacto/menor esfuerzo** (quick wins)
3. **Roadmap sugerido** en 3 fases:
   - Fase 1 (inmediato, <1 día): Quick wins sin cambios arquitecturales
   - Fase 2 (corto plazo, <1 semana): Cambios de arquitectura moderados
   - Fase 3 (largo plazo, >1 semana): Refactors profundos o cambios de stack

---

## Preguntas Clave a Responder

Al final del análisis, responder estas preguntas explícitamente:

1. **¿Next.js es la elección correcta para este proyecto?** ¿O sería mejor Astro, Nuxt, Remix, o SvelteKit dada la naturaleza semi-estática del sitio?

2. **¿Framer Motion está justificado?** ¿O las animaciones podrían hacerse con CSS puro/Tailwind, eliminando ~30KB del bundle?

3. **¿Sanity es el CMS correcto?** ¿O sería más simple usar archivos Markdown/MDX, un headless CMS más simple, o incluso solo los datos estáticos de `data/`?

4. **¿La arquitectura de i18n es óptima?** ¿El patrón `app/[lang]/` + Context es lo mejor, o una librería dedicada haría el trabajo con menos overhead?

5. **¿El proyecto debería deployarse como static export?** El contenido es relativamente estático (productos, testimonios, textos). Un static export eliminaría toda la complejidad de SSR y server costs.

6. **¿Hay deuda técnica acumulada** que valga la pena pagar antes de seguir agregando features?

---

## Escala de Severidad (para hallazgos de arquitectura)

| Nivel | Código | Descripción |
|-------|--------|-------------|
| Crítico | 🔴 CRIT | Decisión arquitectural que compromete seguridad o rendimiento de forma explotable |
| Alto | 🟠 HIGH | Deuda técnica con impacto directo en performance o mantenibilidad |
| Medio | 🟡 MED | Subóptimo pero no bloqueante — mejora con esfuerzo moderado |
| Bajo | 🟢 LOW | Refactor incremental que mejora limpieza sin urgencia |
| Info | ℹ️ INFO | Observación estratégica sin impacto inmediato |

---

## Contexto del Proyecto (leer antes de auditar)

```
Tipo: Landing page + catálogo de productos para empresa colombiana de jugos naturales
Audiencia: B2B (restaurantes, cafeterías) y consumidores finales
Contenido: Relativamente estático (productos, nosotros, contacto) con datos de CMS
Idiomas: Español (principal) e Inglés
Estado: Proyecto en desarrollo activo, aún no en producción
Código base: ~40 componentes, 4 páginas, 1 API route, integración Sanity Studio
Historial: Ver LECCIONES_APRENDIDAS.md — especialmente causas de lentitud y bugs recurrentes
```

---

## Recursos

- **package.json** → Inventario completo de dependencias y versiones
- **LECCIONES_APRENDIDAS.md** → Errores anteriores y reglas del proyecto
- **node_modules/next/dist/docs/01-app/index.md** → Entender la versión exacta de Next.js instalada
- **app/** → Estructura de rutas y estrategias de rendering
- **components/** → Análisis de Server vs Client components
- **sanity/** → Solo leer, no auditar (schemas del CMS)