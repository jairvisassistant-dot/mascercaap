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
  version: "1.2"
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

## Patrón Compartido Aplicable

Antes de interpretar baseline, delta, working tree o trazabilidad, aplicar:

- `.agents/skills/shared-audit-baseline-traceability.md`

Este archivo define el contrato común. Esta skill solo agrega las reglas específicas de auditoría de arquitectura, performance y stack.

---

## Input Requerido (OBLIGATORIO antes de auditar)

Antes de emitir el primer hallazgo, revisar SIEMPRE en este orden:

1. **LECCIONES_APRENDIDAS.md** → causas raíz, deuda conocida y convenciones del proyecto
2. **Otros/Info_Auditorias/** → artefactos previos, si existen:
   - `baseline_info.txt`
   - `baseline_structure.txt`
   - `baseline_dependencies.txt`
   - `audit_code_*.md`
   - `audit_architecture_*.md`
   - `Respuesta-audit_code_*.md`
   - `Respuesta-audit_architecture_*.md`
   - `verification_*.md`
3. **Git state actual** → branch, tracking remoto, commits, working tree y diff contra baseline si existe
4. **Docs locales del framework** cuando el hallazgo dependa de convenciones versionadas del framework

---

## PASO 0 — Contexto, Baseline y Trazabilidad (OBLIGATORIO antes de auditar)

**ANTES de comenzar la auditoría, ejecutar estos pasos:**

### 0A — Leer Historial de Auditorías

Objetivo: no reabrir deuda ya aceptada como si fuera descubrimiento nuevo, no reciclar falsos positivos y no perder trazabilidad del roadmap arquitectural previo.

Checklist mínima:

```text
1. Leer LECCIONES_APRENDIDAS.md
2. Leer los últimos audit_architecture_*.md relevantes
3. Leer las respuestas del desarrollador asociadas
4. Leer las últimas verification_*.md si existen
5. Contrastar con audit_code_*.md si un hallazgo de arquitectura depende de un problema de código ya documentado
6. Registrar explícitamente qué artefactos previos fueron considerados
```

**Regla:** si existe `Otros/Info_Auditorias/` y no se leyó, la auditoría está incompleta.

### 0B — Resolver el Baseline sin asumir commit automático

Resolver baseline con esta prioridad:

1. `Otros/Info_Auditorias/baseline_info.txt`
2. Hash explícito dentro de auditorías o respuestas previas, por ejemplo:
   - `Commit auditado: <hash>`
   - `Snapshot de referencia: <hash>`
3. `HEAD` actual como snapshot lógico si no existe baseline formal
4. Heurística por historial git (`audit|baseline`) como último recurso

```bash
git status --short --branch

BASELINE_HASH=$(cat /home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/baseline_info.txt 2>/dev/null | grep BASELINE_COMMIT | cut -d'=' -f2)

# Fallback: parsear hash desde auditorías/respuestas previas
# Buscar patrones como:
# - Commit auditado: `abc123`
# - Snapshot de referencia: `abc123`

if [ -z "$BASELINE_HASH" ]; then
  BASELINE_HASH=$(git log --oneline --all | grep -i "audit\|baseline" | head -1 | awk '{print $1}')
fi
```

**Regla:** si el baseline no viene de `baseline_info.txt`, declarar la fuente en el reporte.

### 0C — Detectar el modo real de comparación

No asumir que todos los cambios están comiteados.

| Escenario | Qué comparar |
|---|---|
| Hay baseline confiable, commits posteriores y working tree limpio | `BASELINE..HEAD` |
| Hay baseline confiable, sin commits posteriores pero con working tree modificado | `git diff BASELINE` |
| Hay baseline confiable, commits posteriores y además working tree modificado | reportar ambos |
| No hay baseline confiable | auditoría full del estado actual + advertencia explícita |

```bash
git status --short --branch

if [ -n "$BASELINE_HASH" ]; then
  git log --oneline "$BASELINE_HASH"..HEAD
  git diff --name-only "$BASELINE_HASH"
fi
```

**Regla:** el reporte debe declarar si se auditó `baseline..HEAD`, working tree vs baseline, repo actual completo, o una combinación.

### 0D — Validar capacidad de trazabilidad Git / GitHub

**Hacer commit local NO requiere conexión a GitHub.** GitHub solo importa para `push`, PR o trazabilidad remota compartida.

Validar ambos planos por separado:

#### Plano 1 — Git local

```bash
git rev-parse --is-inside-work-tree
git status --short --branch
git remote -v
```

#### Plano 2 — GitHub (`gh`) opcional

```bash
gh auth status
```

Interpretación rápida:

- **Git local OK + `gh` no autenticado** → se puede auditar y se puede hacer commit local si el usuario lo autoriza
- **Git local OK + `gh` autenticado** → además se puede usar trazabilidad remota (`push`, PR, issues) si el usuario lo pide
- **Git local roto** → detenerse, porque ni siquiera hay baseline confiable del repo

**Regla:** no bloquear auditoría ni commit local por falta de auth de GitHub.

### 0E — Baseline commit formal (OPCIONAL y solo con permiso explícito)

Crear commit baseline solo si se cumplen TODAS estas condiciones:

1. El usuario pidió explícitamente máxima trazabilidad con commit baseline
2. No existe ya un baseline confiable suficiente
3. Hay cambios que vale la pena congelar antes de auditar
4. El usuario autorizó el commit de forma explícita

```bash
git add -A
git commit -m "chore(audit): baseline snapshot before architecture audit YYYY-MM-DD HH:MM"
git log -1 --format='%H' HEAD
```

**Reglas críticas:**

- NO asumir commit automático
- NO crear baseline commit si el usuario no lo pidió
- NO confundir `gh auth status` con requisito para commit local
- Si no hay permiso, usar baseline lógico (`baseline_info`, auditoría previa o `HEAD`) y continuar

### 0F — Generar Archivo de Contexto Baseline

Crear o actualizar en `Otros/Info_Auditorias/` un snapshot documental del estado auditado. Sirve aunque no exista commit formal nuevo.

Contenido mínimo del snapshot:

- baseline hash o snapshot lógico usado
- fuente del baseline
- fecha
- branch actual
- modo de comparación
- si había working tree modificado
- estructura del scope auditado
- dependencias relevantes

### 0G — Archivo de Auditoría en Info_Auditorias

Crear el archivo de informe vacío que se llenará al finalizar:

```
/home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/audit_[TIPO]_[FECHA].md
```

Formato del nombre: `audit_architecture_YYYY-MM-DD_HHMM.md`

Contenido inicial:
```markdown
# Auditoría de Arquitectura — [FECHA]

## Metadatos
- **Tipo:** Arquitectura
- **Fecha:** [FECHA]
- **Baseline / Snapshot:** [HASH O DESCRIPCIÓN]
- **Fuente del baseline:** [baseline_info|auditoría previa|respuesta previa|HEAD actual|heurística git|sin baseline]
- **Modo de comparación:** [repo actual completo|baseline..HEAD|working tree vs baseline|ambos]
- **Artefactos previos leídos:** [LISTA]
- **Auditor:** software-architecture-auditor v1.2
- **Versión Next.js:** [NEXT_VERSION]
- **Commits desde baseline:** [COMMITS_COUNT]

## Estado Pre-Auditoría (Baseline)
- Baseline o snapshot: [HASH O DESCRIPCIÓN]
- Fecha baseline: [FECHA]
- Working tree al iniciar: [limpio|modificado]
- Archivos en scope: [FILES_COUNT]
- Dependencias totales: [DEPS_COUNT]

## Hallazgos Detallados
- [TIPO] Área → Descripción específica
  - Estado actual: ...
  - Problema: ...
  - Alternativa: ...
  - Impacto: Alto / Medio / Bajo
  - Esfuerzo: Alto / Medio / Bajo
  - Relación impacto/esfuerzo: ...

## Resumen Ejecutivo
- Total hallazgos: [TOTAL]
- 🔴 Críticos: [CRIT_COUNT]
- 🟠 Altos: [HIGH_COUNT]
- 🟡 Medios: [MED_COUNT]
- 🟢 Bajos/Info: [LOW_COUNT]
```

---

## Metodología de Auditoría — 10 Pasos

Antes de emitir recomendaciones nuevas, contrastar contra `Otros/Info_Auditorias/` para detectar:
- quick wins ya sugeridos
- deuda aceptada/documentada
- fricciones operativas persistentes
- respuestas del desarrollador que cambian el criterio de priorización
- hallazgos de código que condicionan la arquitectura

Si un problema ya fue aceptado como deuda o diferido con justificación válida, reportarlo como contexto/persistencia, no como “descubrimiento nuevo”.

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

## SALIDA — Guardar Informe en Info_Auditorias (OBLIGATORIO al finalizar)

**AL FINALIZAR la auditoría, ejecutar estos pasos:**

### Guardar el Informe Completo

El siguiente bloque es una **guía operativa de prellenado**, no una automatización cerrada. Primero resolvé baseline/trazabilidad y completá los hallazgos reales; recién después completá resúmenes, quick wins y roadmap.

```bash
# Crear directorio si no existe
mkdir -p /home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias

# Nombre del archivo con timestamp
AUDIT_FILE="/home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/audit_architecture_$(date +'%Y%m%d_%H%M').md"

# Resolver baseline o snapshot original
BASELINE_COMMIT=$(cat /home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/baseline_info.txt 2>/dev/null | grep BASELINE_COMMIT | cut -d'=' -f2)
BASELINE_SOURCE="baseline_info"

if [ -z "$BASELINE_COMMIT" ]; then
  BASELINE_COMMIT="(completar desde auditoría previa, respuesta previa o HEAD)"
  BASELINE_SOURCE="auditoría previa | respuesta previa | HEAD actual | heurística git"
fi

# Estado real del repo
cd /home/server/Escritorio/mascercaap/mas-cerca-ap
WORKTREE_STATE=$( [ -n "$(git status --short)" ] && printf "modificado" || printf "limpio" )
ARTEFACTS_READ="LECCIONES_APRENDIDAS.md + artefactos relevantes de Info_Auditorias"
NEXT_VERSION="(completar desde package.json o node_modules/next/package.json)"

# Detectar delta cuando exista baseline formal o hash confiable
if [ "$BASELINE_COMMIT" != "(completar desde auditoría previa, respuesta previa o HEAD)" ]; then
  COMMITS_SINCE=$(git log --oneline "$BASELINE_COMMIT"..HEAD 2>/dev/null | wc -l)
  COMMITS_LIST=$(git log --oneline "$BASELINE_COMMIT"..HEAD 2>/dev/null | sed 's/^/- /')
  DIFF_MODE="baseline..HEAD o working tree vs baseline, según estado real"
else
  COMMITS_SINCE=0
  COMMITS_LIST="(sin baseline formal; auditoría sobre estado actual)"
  DIFF_MODE="repo actual completo"
fi

# Métricas del scope (completar o calcular antes de cerrar el reporte)
FILES_COUNT="(completar)"
DEPS_COUNT="(completar)"

# Generar template base del informe
cat > "$AUDIT_FILE" << 'EOF'
# Auditoría de Arquitectura — [FECHA]

## Metadatos
- **Tipo:** Arquitectura
- **Fecha:** [FECHA]
- **Baseline / Snapshot:** [BASELINE_HASH]
- **Fuente del baseline:** [BASELINE_SOURCE]
- **Modo de comparación:** [DIFF_MODE]
- **Artefactos previos leídos:** [ARTEFACTS_READ]
- **Auditor:** software-architecture-auditor v1.2
- **Versión Next.js:** [NEXT_VERSION]
- **Commits desde baseline:** [COMMITS_COUNT]

## Estado Pre-Auditoría (Baseline)
- Baseline o snapshot: [BASELINE_HASH]
- Fecha baseline: [BASELINE_DATE]
- Working tree al iniciar: [WORKTREE_STATE]
- Archivos en scope: [FILES_COUNT]
- Dependencias totales: [DEPS_COUNT]

## Commits Realizados Desde Baseline
[COMMITS_LIST]

## Hallazgos Detallados
(Completar primero los hallazgos reales antes de resumir)

## Resumen Ejecutivo
- Total hallazgos: [TOTAL]
- 🔴 Críticos: [CRIT_COUNT]
- 🟠 Altos: [HIGH_COUNT]
- 🟡 Medios: [MED_COUNT]
- 🟢 Bajos/Info: [LOW_COUNT]

## Quick Wins (Top 5)
1. ...
2. ...
3. ...
4. ...
5. ...

## Roadmap de Mejoras
### Fase 1 (inmediato, <1 día)
- ...

### Fase 2 (corto plazo, <1 semana)
- ...

### Fase 3 (largo plazo, >1 semana)
- ...

## Preguntas de Seguimiento Respondidas
1. ¿Quick wins aplicados? [Sí/No/Parcial] — [evidencia]
2. ¿Deuda técnica grew/shrunk? [+/=/-] — [evidencia]
3. ¿Métricas performance improved? [Sí/No] — [métricas]
4. ¿Patrones correctos se mantienen? [Sí/No] — [violaciones si hay]
5. ¿Nuevos hallazgos criticos? [Sí/No] — [si sí, listar]
6. ¿Fricción operativa? [Sí/No] — [descripción si sí]

## Preguntas de Diseño Inicial (solo si proyecto greenfield)
(Esta sección se omite si el proyecto ya existe)

## Archivo de Referencia
Este informe fue generado usando un baseline o snapshot lógico del estado del código.
Para comparar con auditorías futuras, ver:
- baseline_info.txt
- baseline_structure.txt
- baseline_dependencies.txt
EOF

# Prellenar trazabilidad y metadata base
sed -i "s/\[FECHA\]/$(date +'%Y-%m-%d %H:%M')/g" "$AUDIT_FILE"
sed -i "s/\[BASELINE_HASH\]/${BASELINE_COMMIT:-'(sin baseline formal)'}/g" "$AUDIT_FILE"
sed -i "s/\[BASELINE_DATE\]/$(cat /home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/baseline_info.txt 2>/dev/null | grep BASELINE_DATE | cut -d'=' -f2 || echo 'N/A')/g" "$AUDIT_FILE"
sed -i "s/\[COMMITS_COUNT\]/${COMMITS_SINCE}/g" "$AUDIT_FILE"
sed -i "s/\[FILES_COUNT\]/${FILES_COUNT}/g" "$AUDIT_FILE"
sed -i "s/\[DEPS_COUNT\]/${DEPS_COUNT}/g" "$AUDIT_FILE"
sed -i "s/\[COMMITS_LIST\]/${COMMITS_LIST:-'(sin cambios)'}/g" "$AUDIT_FILE"
sed -i "s/\[BASELINE_SOURCE\]/${BASELINE_SOURCE:-'sin baseline formal'}/g" "$AUDIT_FILE"
sed -i "s/\[DIFF_MODE\]/${DIFF_MODE}/g" "$AUDIT_FILE"
sed -i "s/\[ARTEFACTS_READ\]/${ARTEFACTS_READ:-'LECCIONES_APRENDIDAS.md + artefactos relevantes de Info_Auditorias'}/g" "$AUDIT_FILE"
sed -i "s/\[WORKTREE_STATE\]/${WORKTREE_STATE:-'no registrado'}/g" "$AUDIT_FILE"
sed -i "s/\[NEXT_VERSION\]/${NEXT_VERSION}/g" "$AUDIT_FILE"

# IMPORTANTE:
# 1) completar Hallazgos Detallados
# 2) completar Quick Wins, Roadmap y Preguntas de Seguimiento Respondidas
# 3) calcular después CRIT/HIGH/MED/LOW sobre el informe ya completado
# 4) recién ahí reemplazar los placeholders [CRIT_COUNT], [HIGH_COUNT], etc.

echo "✅ Informe guardado en: $AUDIT_FILE"
```

### Orden correcto de cierre del reporte

1. Prellenar metadata, baseline, diff mode y trazabilidad.
2. Escribir **primero** los hallazgos reales.
3. Completar `FILES_COUNT`, `DEPS_COUNT` y `NEXT_VERSION`.
4. Completar Quick Wins, Roadmap y preguntas de seguimiento respondidas.
5. Calcular después los conteos (`CRIT_COUNT`, `HIGH_COUNT`, etc.) sobre el informe ya completado.
6. Reemplazar placeholders del resumen ejecutivo al final.

**Reglas críticas al finalizar:**

- Guardar siempre el informe en `Otros/Info_Auditorias/`
- No hacer commit automático del informe
- Si el usuario quiere commit del informe, pedir autorización explícita o seguir una instrucción explícita previa
- Si hay GitHub auth disponible, eso solo habilita trazabilidad remota opcional; no obliga a usarla

---

## Preguntas de Seguimiento (Usar en auditorías subsecuentes)

1. **¿Los quick wins de auditorías anteriores fueron aplicados?**
   ¿Siguen pendientes o ya se resolvieron?

2. **¿La deuda técnica identificada creció o se redujo?**
   ¿Hay nueva deuda acumulada desde la última auditoría?

3. **¿Las métricas de performance mejoraron?**
   Bundle size, tiempo de carga, Lighthouse scores

4. **¿Los patrones correctos se mantienen consistentemente?**
   - `m` (no `motion`) ✓
   - `dict` como prop ✓
   - `SITE_CONFIG` para contactos ✓
   - Zod con i18n factory ✓

5. **¿Hay nuevos hallazgos que cambien el roadmap?**
   ¿Algún issue nuevo descubierto tiene severidad CRIT o HIGH?

6. **¿Las decisiones arquitecturales actuales causan fricción operativa?**
   ¿El equipo está chocando contra paredes por decisiones de diseño?

---

## Preguntas de Diseño Inicial (Solo para proyectos greenfield)

**Solo responder estas si el proyecto es nuevo y las decisiones aún no se han tomado.**
Si el proyecto ya existe y está en producción, omitir esta sección.

1. **¿Next.js es la elección correcta para este proyecto?**
   ¿O sería mejor Astro, Nuxt, Remix, o SvelteKit dada la naturaleza semi-estática del sitio?

2. **¿Framer Motion está justificado?**
   ¿O las animaciones podrían hacerse con CSS puro/Tailwind, eliminando ~30KB del bundle?

3. **¿Sanity es el CMS correcto?**
   ¿O sería más simple usar archivos Markdown/MDX, un headless CMS más simple, o incluso solo los datos estáticos de `data/`?

4. **¿La arquitectura de i18n es óptima?**
   ¿El patrón `app/[lang]/` + Context es lo mejor, o una librería dedicada haría el trabajo con menos overhead?

5. **¿El proyecto debería deployarse como static export?**
   El contenido es relativamente estático (productos, testimonios, textos). Un static export eliminaría toda la complejidad de SSR y server costs.

6. **¿Hay deuda técnica que valga la pena pagar antes de seguir?**
   ¿La deuda actual justifica un pause antes de agregar features?

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
