---
name: software-code-auditor
description: >
  Auditoría línea por línea de código fuente: bugs, vulnerabilidades de seguridad,
  deuda técnica y calidad. Trigger: "auditar", "revisar seguridad", "buscar bugs",
  "revisar código", "análisis de código", "evaluar calidad del código",
  "revisar deuda técnica", "auditoría de seguridad".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.2"
---

## When to Use

- Usuario pide "auditar" o "revisar" el código
- Solicitud de "revisar seguridad" o "buscar vulnerabilidades"
- Evaluación de "calidad del código" o "deuda técnica"
- Revisión de bugs, inconsistencias o código muerto
- Verificación pre-deploy de un feature o refactor

## Exclusiones (NO auditar)

```
node_modules/          → excluir
.next/                 → excluir
public/                → solo verificar robots.txt
.env.local             → excluir (seguridad)
sanity/schemas/        → excluir (CMS, fuera de alcance)
scripts/migrate*.ts    → exclude (script one-time)
```

---

## Patrón Compartido Aplicable

Antes de interpretar baseline, delta, working tree o trazabilidad, aplicar:

- `.agents/skills/shared-audit-baseline-traceability.md`

Este archivo define el contrato común. Esta skill solo agrega las reglas específicas de auditoría de código.

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
4. **Docs locales del framework** cuando un hallazgo dependa de convenciones versionadas del framework

---

## PASO 0 — Contexto, Baseline y Trazabilidad (OBLIGATORIO antes de auditar)

**ANTES de comenzar la auditoría, ejecutar estos pasos:**

### 0A — Leer Historial de Auditorías

Objetivo: evitar falsos positivos reciclados, deuda ya aceptada reportada como “nueva” y pérdida de contexto sobre fixes o regresiones previas.

Checklist mínima:

```text
1. Leer LECCIONES_APRENDIDAS.md
2. Leer los últimos audit_code_*.md y audit_architecture_*.md relevantes
3. Leer las respuestas del desarrollador asociadas
4. Leer las últimas verification_*.md si existen
5. Registrar explícitamente qué artefactos previos fueron considerados
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
git commit -m "chore(audit): baseline snapshot before code audit YYYY-MM-DD HH:MM"
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
/home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/audit_code_YYYY-MM-DD_HHMM.md
```

Template inicial:
```markdown
# Auditoría de Código — [FECHA]

## Metadatos
- **Tipo:** Código
- **Fecha:** [FECHA]
- **Baseline / Snapshot:** [HASH O DESCRIPCIÓN]
- **Fuente del baseline:** [baseline_info|auditoría previa|respuesta previa|HEAD actual|heurística git|sin baseline]
- **Modo de comparación:** [repo actual completo|baseline..HEAD|working tree vs baseline|ambos]
- **Artefactos previos leídos:** [LISTA]
- **Auditor:** software-code-auditor v1.2
- **Commits desde baseline:** [COMMITS_COUNT]

## Estado Pre-Auditoría (Baseline)
- Baseline o snapshot: [HASH O DESCRIPCIÓN]
- Fecha baseline: [FECHA]
- Working tree al iniciar: [limpio|modificado]
- Archivos en scope: [FILES_COUNT]
- Dependencias totales: [DEPS_COUNT]

## Hallazgos Detallados
- [SEVERIDAD] ID-REGLA — Archivo:línea
  - Síntoma: ...
  - Causa raíz: ...
  - Solución: ...

## Resumen Ejecutivo
- Total hallazgos: [TOTAL]
- 🔴 Críticos: [CRIT_COUNT]
- 🟠 Altos: [HIGH_COUNT]
- 🟡 Medios: [MED_COUNT]
- 🟢 Bajos/Info: [LOW_COUNT]

## Resumen por Categoría
- 🟥 Seguridad (SEC): [SEC_COUNT]
- 🟠 Bugs (BUG): [BUG_COUNT]
- 🔵 Next.js (NEXT): [NEXT_COUNT]
- 🟡 TypeScript (TS): [TS_COUNT]
- 🟢 Rendimiento (PERF): [PERF_COUNT]
- 🔷 Accesibilidad (A11Y): [A11Y_COUNT]
- 🟣 Deuda Técnica (DT): [DT_COUNT]
- 🩷 UX y Contenido (UX): [UX_COUNT]

## Top 5 Issues (por impacto en usuario)
1. ...
2. ...
3. ...
4. ...
5. ...

## Archivos Sin Hallazgos
- ...

## Riesgos no validados por ejecución
- [cambio o hallazgo] — [qué no se pudo validar sin build/test/runtime]
```

---

## Metodología de Auditoría — Orden Estricto

### PASO 0 — Mapa del proyecto

Antes de auditar, construir el mapa mental:
1. Qué archivos exportan qué (componentes, funciones, tipos, constantes)
2. Qué páginas existen y qué componentes usan
3. Cuáles son los archivos de datos y quién los consume
4. Cuáles son las claves del diccionario i18n y cuáles se usan

### PASO 1 — LECCIONES_APRENDIDAS.md (Checklist Prioritario)

LEER primero `LECCIONES_APRENDIDAS.md` en la raíz del proyecto.
Cada regla violada = hallazgo ANTES de continuar.

Además contrastar contra `Otros/Info_Auditorias/` para detectar:
- falsos positivos ya descartados
- deuda aceptada/documentada
- regresiones de fixes previos
- respuestas del desarrollador que requieren validación especial

Si un hallazgo previo ya fue aceptado como deuda o diferido con justificación válida, reportarlo como contexto/persistencia, no como “descubrimiento nuevo”.

### PASO 2 — Código Muerto (CRÍTICO — categoría más omitida en auditorías)

Para cada archivo en `components/`, `data/`, `lib/`, `hooks/`, `types/`:
```
1. Listar qué exporta
2. grep ese export en TODOS los archivos del proyecto
3. Si no aparece en ningún import → código muerto
```

- Función exportada sin importadores → eliminar
- Tipo en `types/index.ts` sin uso → eliminar o documentar
- Archivo de datos sin consumidores → huérfano

### PASO 3 — Auditoría i18n Bidireccional (CRÍTICO — causa de bugs reales)

**3A — Claves usadas en componentes pero inexistentes en JSON**
```
Para cada dict.X.Y.Z o t.X en .tsx/.ts:
  → Verificar que existe en messages/es.json
  → Verificar que existe en messages/en.json
  → Si falta en alguno → error de runtime en producción
```

**3B — Claves en JSON sin uso en componentes (HUÉRFANAS)**
```
Para cada clave de primer nivel en messages/es.json:
  → Buscar referencias en todos los .tsx y .ts
  → Si no se usa → clave huérfana = bug de localización potencial
```

**3C — Asimetría entre es.json y en.json**
```
Los dos JSON deben tener exactamente las mismas claves.
Cualquier diferencia → bug de localización.
```

### PASO 4 — Consistencia del Grafo de Imports

```
Para cada archivo refactorizado recientemente:
  → Verificar que todos los imports resuelven a exportaciones existentes
  → Si importa { Tipo } desde @/data/algo pero fue movido a @/types → import roto
  → Verificar especialmente: types/index.ts, data/faq.ts, lib/faq-matcher.ts, lib/schemas/contact.ts
```

### PASO 5 — Consistencia de Datos Entre Archivos

```
FAQ vs catálogo: tamaños en data/faq.ts deben coincidir con presentation de data/products.ts
Datos de contacto: ningún archivo fuera de lib/config.ts debe tener teléfono o email hardcodeado
presentationOrder: dentro de cada line, valores 1, 2, 3... sin gaps ni duplicados
```

### PASO 6 — Schemas Zod y Localización

```
Para cada schema Zod:
  → ¿Tiene mensajes de error hardcodeados en español?
  → ¿Ese schema se usa en un componente cliente renderizado en múltiples idiomas?
  → Si sí → bug de localización. Debe ser factory function que acepte msgs del diccionario
```

---

## Las 8 Categorías de Auditoría

### 🟥 CAT-1 — Seguridad (OWASP Top 10)

| ID | Regla | Severidad |
|----|-------|-----------|
| SEC-01 | NO loguear PII (nombre, email, teléfono) en console.log en producción | CRITICAL |
| SEC-02 | Toda API route debe validar body con Zod ANTES de procesarlo | CRITICAL |
| SEC-03 | API routes públicas deben tener rate limiting o documentar ausencia | HIGH |
| SEC-04 | Variables sensibles (`RESEND_API_KEY`, etc) NUNCA con prefijo NEXT_PUBLIC_ | CRITICAL |
| SEC-05 | Links externos con `target="_blank"` deben incluir `rel="noopener noreferrer"` | MED |
| SEC-06 | Datos de usuario escapados antes de interpolar en HTML (XSS) | CRITICAL |
| SEC-07 | Datos de contacto vienen de SITE_CONFIG, no hardcodeados | HIGH |
| SEC-08 | iframes externos deben tener `sandbox` o `referrerPolicy` | MED |

### 🟠 CAT-2 — Bugs y Correctitud

| ID | Regla | Severidad |
|----|-------|-----------|
| BUG-01 | Todo setInterval/setTimeout debe cleanup en useEffect | HIGH |
| BUG-02 | IDs de setTimeout en ref para poder cancelarlos (clearTimeout) | MED |
| BUG-03 | Valores server/client idénticos en primer render (no hydration mismatch) | HIGH |
| BUG-04 | Date.now() dentro de componentes debe estar en useEffect o useMemo | MED |
| BUG-05 | Arrays de dependencias de useEffect exhaustivos | MED |
| BUG-06 | catch vacío o solo console.error debe retornar estado de error al usuario | HIGH |
| BUG-07 | Textos de contenido en español (sin mezcla accidental de inglés) | MED |
| BUG-08 | Datos mock sin errores tipográficos ni whitespace accidental | LOW |
| BUG-09 | Función recibe parámetro que NO usa en TODAS sus ramas → bug silencioso | HIGH |

### 🔵 CAT-3 — Next.js App Router

| ID | Regla | Severidad |
|----|-------|-----------|
| NEXT-01 | "use client" solo si hay hooks, eventos browser, o APIs de cliente. Si solo usa useDictionary() → pasar dict como prop | HIGH |
| NEXT-02 | Componentes compartidos solo en app/[lang]/layout.tsx | MED |
| NEXT-03 | Solo next/image, nunca <img> nativo | HIGH |
| NEXT-04 | Imágenes above-the-fold con priority={true} | MED |
| NEXT-05 | Imágenes en grids con sizes apropiado | MED |
| NEXT-06 | sitemap.ts usa fecha fija, no new Date() sin args | MED |
| NEXT-07 | robots.txt existe en /public/ | LOW |
| NEXT-08 | JSON-LD (Organization schema) en layout.tsx | MED |
| NEXT-09 | API routes retornan códigos HTTP correctos (200, 400, 500) | HIGH |
| NEXT-10 | NEXT_PUBLIC_* solo para datos NO sensibles | HIGH |
| NEXT-11 | proxy.ts en raíz con función exportada proxy. middleware.ts es DEPRECADA en Next.js 16 — genera warning | HIGH |

### 🟡 CAT-4 — TypeScript

| ID | Regla | Severidad |
|----|-------|-----------|
| TS-01 | Prohibido any explícito o implícito | HIGH |
| TS-02 | Tipos compartidos en types/index.ts, no en componentes ni data/ | MED |
| TS-03 | Union types numéricos estrictos cuando el rango es conocido (rating: 1|2|3|4|5) | LOW |
| TS-04 | Props opcionales no usadas por ningún padre → eliminar | MED |
| TS-05 | z.infer reusa tipos de types/index.ts si ya existen | LOW |
| TS-06 | Imports de tipos movidos a otro archivo → import roto silencioso | HIGH |

### 🟢 CAT-5 — Rendimiento

| ID | Regla | Severidad |
|----|-------|-----------|
| PERF-01 | Componentes con solo whileInView y dict → deben recibir dict como prop, no via Context | MED |
| PERF-02 | Valores computados costosos en useMemo | MED |
| PERF-03 | Hero con priority={true} y sizes correctos | MED |
| PERF-04 | Carruseles con autoplay pausan con IntersectionObserver | LOW |
| PERF-05 | No crear objetos/arrays nuevos en cada render sin useMemo | MED |
| PERF-06 | Usar m en lugar de motion (LazyMotion ya está en DictionaryProvider) | MED |

### 🔷 CAT-6 — Accesibilidad (WCAG AA)

| ID | Regla | Severidad |
|----|-------|-----------|
| A11Y-01 | Botones sin texto visible tienen aria-label (del diccionario si multilenguaje) | HIGH |
| A11Y-02 | alt descriptivo, en el idioma de la interfaz | MED |
| A11Y-03 | Elementos interactivos son <button> o <a>, no <div> | HIGH |
| A11Y-04 | Contraste WCAG AA (ratio mínimo 4.5:1 para texto normal) | MED |
| A11Y-05 | iframes con title | MED |
| A11Y-06 | Formularios con label asociado a cada input | MED |
| A11Y-07 | aria-label hardcodeados en español en componentes /en/ → bug de localización | HIGH |

### 🟣 CAT-7 — Calidad de Código y Deuda Técnica

| ID | Regla | Severidad |
|----|-------|-----------|
| DT-01 | TODOs documentados con fecha estimada o ticket | LOW |
| DT-02 | Wrappers sin lógica eliminados | LOW |
| DT-03 | Datos de contacto en SITE_CONFIG, no hardcodeados | HIGH |
| DT-04 | No href="#" sin documentar | MED |
| DT-05 | Teléfono/email en un solo lugar (lib/config.ts) | MED |
| DT-06 | Props declaradas no usadas por ningún padre → eliminar | MED |
| DT-07 | Código muerto → ver PAS0 2 | HIGH |

### 🩷 CAT-8 — UX y Contenido

| ID | Regla | Severidad |
|----|-------|-----------|
| UX-01 | Estados toast/error tienen auto-cierre (no visibles indefinidamente) | MED |
| UX-02 | CTAs de carruseles redirigen a URL contextual, no genérica | MED |
| UX-03 | Countdown timer sin flash de 00:00:00 en hydration | MED |
| UX-04 | Sin errores ortográficos ni palabras en idioma incorrecto | LOW |
| UX-05 | Respuestas FAQ verificadas contra catálogo real (tamaños, precios, datos) | HIGH |

---

## Escala de Severidad

| Nivel | Código | Descripción |
|-------|--------|-------------|
| Crítico | 🔴 CRIT | Vulnerabilidad explotable o bug que rompe la app en producción |
| Alto | 🟠 HIGH | Bug grave o deuda técnica con impacto directo en el usuario |
| Medio | 🟡 MED | Mala práctica, código frágil o inconsistencia arquitectural |
| Bajo | 🟢 LOW | Mejora de calidad, limpieza o convención no seguida |
| Info | ℹ️ INFO | Observación sin impacto inmediato |

---

## Formato de Reporte

Para cada hallazgo:
```
[SEVERIDAD] ID-REGLA — Archivo:línea
Síntoma: qué ve el usuario o qué falla
Causa raíz: por qué ocurrió
Solución: cambio exacto a hacer
```

Al finalizar:
1. Tabla resumen con conteo por severidad
2. Top 5 issues ordenadas por impacto real en el usuario
3. Lista de archivos SIN hallazgos (confirmados limpios — para no revisarlos dos veces)

---

## SALIDA — Guardar Informe en Info_Auditorias (OBLIGATORIO al finalizar)

**AL FINALIZAR la auditoría, ejecutar estos pasos:**

### Guardar el Informe Completo

El siguiente bloque es una **guía operativa de prellenado**, no una automatización cerrada. Primero resolvé baseline/trazabilidad y completá los hallazgos; recién después completá resúmenes y conteos.

```bash
# Crear directorio si no existe
mkdir -p /home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias

# Nombre del archivo con timestamp
AUDIT_FILE="/home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/audit_code_$(date +'%Y%m%d_%H%M').md"

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
# Auditoría de Código — [FECHA]

## Metadatos
- **Tipo:** Código
- **Fecha:** [FECHA]
- **Baseline / Snapshot:** [BASELINE_HASH]
- **Fuente del baseline:** [BASELINE_SOURCE]
- **Modo de comparación:** [DIFF_MODE]
- **Artefactos previos leídos:** [ARTEFACTS_READ]
- **Auditor:** software-code-auditor v1.2
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

## Resumen por Categoría
- 🟥 Seguridad (SEC): [SEC_COUNT]
- 🟠 Bugs (BUG): [BUG_COUNT]
- 🔵 Next.js (NEXT): [NEXT_COUNT]
- 🟡 TypeScript (TS): [TS_COUNT]
- 🟢 Rendimiento (PERF): [PERF_COUNT]
- 🔷 Accesibilidad (A11Y): [A11Y_COUNT]
- 🟣 Deuda Técnica (DT): [DT_COUNT]
- 🩷 UX y Contenido (UX): [UX_COUNT]

## Top 5 Issues (por impacto en usuario)
1. ...
2. ...
3. ...
4. ...
5. ...

## Archivos Sin Hallazgos
(Archivos verificados y confirmados limpios)

## Riesgos no validados por ejecución
- [cambio o hallazgo] — [qué no se pudo validar sin build/test/runtime]

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

# IMPORTANTE:
# 1) completar Hallazgos Detallados
# 2) calcular/manual o programáticamente CRIT/HIGH/MED/LOW y categorías
# 3) recién ahí reemplazar los placeholders [CRIT_COUNT], [HIGH_COUNT], etc.

echo "✅ Informe guardado en: $AUDIT_FILE"
```

### Orden correcto de cierre del reporte

1. Prellenar metadata, baseline, diff mode y trazabilidad.
2. Escribir **primero** los hallazgos reales.
3. Completar `FILES_COUNT` y `DEPS_COUNT`.
4. Calcular después los conteos (`CRIT_COUNT`, `HIGH_COUNT`, etc.) sobre el informe ya completado.
5. Reemplazar placeholders del resumen ejecutivo y categorías al final.

**Reglas críticas al finalizar:**

- Guardar siempre el informe en `Otros/Info_Auditorias/`
- No hacer commit automático del informe
- Si el usuario quiere commit del informe, pedir autorización explícita o seguir una instrucción explícita previa
- Si hay GitHub auth disponible, eso solo habilita trazabilidad remota opcional; no obliga a usarla

---

## Restricciones (Red Lines)

```
❌ NO dar aprobaciones genéricas ("el código está bien")
❌ NO ignorar errores de tipos aunque el código "parezca funcionar"
❌ NO sugerir cambios cosméticos sin antes resolver los bugs CRITICAL
❌ NO crear nuevo código productivo en la auditoría — solo identificar problemas
❌ NO auditar node_modules, .next, .env.local, sanity/schemas
❌ NO asumir commit baseline automático ni commit automático del reporte
❌ NO bloquear la auditoría por falta de login en GitHub si Git local funciona
```

En una línea: **contexto primero, baseline explícito, delta real, cero commits automáticos**.

---

## Patrones Correctos de Este Proyecto (Referencia)

```typescript
// ✅ Framer Motion — usar m, no motion
import { m, AnimatePresence } from "framer-motion";
// LazyMotion ya está en DictionaryProvider.tsx

// ✅ i18n — dict como prop en componentes que solo renderizan
export function Componente({ dict }: { dict: Dictionary }) { ... }
// NO: const { dict } = useDictionary();

// ✅ Datos de contacto
import { SITE_CONFIG } from "@/lib/config";
SITE_CONFIG.phoneDisplay / SITE_CONFIG.emailContact
// NO: strings hardcodeados

// ✅ Tipos
import type { Product, FAQQuestion } from "@/types";
// NO: definir tipos en archivos de datos o componentes

// ✅ Zod con i18n
createContactSchema(dict.contact.validation)
// NO: z.string().min(2, "Mensaje hardcodeado en español")

// ✅ Proxy (Next.js 16)
export default function proxy(request: Request) // en proxy.ts raíz
// middleware.ts es DEPRECADA en Next.js 16
```

---

## Recursos

- **LECCIONES_APRENDIDAS.md** → Causas raíz de errores anteriores (checklist prioritario)
- **messages/es.json** y **messages/en.json** → Verificar simetría de claves i18n
- **types/index.ts** → Tipos compartidos del proyecto
- **lib/config.ts** → Datos de contacto centralizados
