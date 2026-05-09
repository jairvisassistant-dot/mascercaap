---
name: software-audit-verifier
description: >
  Verificación de cambios post-auditoría. Compara el estado actual del código,
  commits y working tree contra un baseline explícito para validar si los hallazgos
  previos fueron corregidos, siguen abiertos, quedaron parciales o introdujeron
  regresiones. Trigger: "verificar cambios", "auditar cambios", "post-auditoría",
  "validar fixes", "seguimiento de auditoría".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.1"
---

## When to Use

- Después de implementar cambios basados en una auditoría previa
- Solicitud de "verificar cambios", "auditar cambios", "post-auditoría"
- Seguimiento de progreso: "¿se aplicaron los fixes?"
- Verificación de que no hubo regresiones tras los cambios
- Comparación entre auditoría previa, respuesta del desarrollador y estado actual del repo

---

## Patrón Compartido Aplicable

Antes de interpretar baseline, delta, working tree o trazabilidad, aplicar:

- `.agents/skills/shared-audit-baseline-traceability.md`

Este archivo define el contrato común. Esta skill solo agrega las reglas específicas de verificación post-auditoría.

---

## Input Requerido

Esta skill necesita contexto previo. Buscar en este orden:

1. **LECCIONES_APRENDIDAS.md** → causas raíz, decisiones y convenciones ya documentadas
2. **Otros/Info_Auditorias/** → artefactos previos:
   - `baseline_info.txt` → hash baseline formal, si existe
   - `baseline_structure.txt` → estructura baseline, si existe
   - `audit_code_*.md` → auditorías de código
   - `audit_architecture_*.md` → auditorías de arquitectura
   - `Respuesta-audit_code_*.md` → respuesta del desarrollador a código
   - `Respuesta-audit_architecture_*.md` → respuesta del desarrollador a arquitectura
   - `verification_*.md` → verificaciones previas, si existen
3. **Git state actual** → commits, working tree y diff contra baseline

---

## Principios Críticos

1. **Esto NO es una auditoría full nueva.** Es una verificación delta contra un baseline previo.
2. **Verificá estado real del repo, no solo commits.** Si no hay commits nuevos pero sí working tree modificado, eso TAMBIÉN cuenta como cambio verificable.
3. **Leé SIEMPRE la respuesta del desarrollador** antes de concluir estados. La verificación debe contrastar:
   - hallazgo previo
   - decisión/promesa del desarrollador
   - estado real actual
4. **No confundas “archivo no cambiado” con “hallazgo irrelevante”.**
   - No revises archivos no cambiados para inventar issues nuevos.
   - Sí podés reportarlos como **persistentes** o **sin cambios** si el problema sigue abierto.
5. **No marques como RESUELTO un fix cosmético** si la causa raíz o superficies secundarias siguen rotas.
6. **Toda conclusión debe tener evidencia verificable**: diff, lectura actual, grep, referencias vivas/rotas, imports, assets, estado git o documentación oficial del framework cuando aplique.
7. **Si un fix toca convenciones del framework**, NO alcanza con leer el código: hay que contrastarlo contra la documentación versionada instalada en el proyecto.

---

## Metodología de Verificación — 8 Pasos

### PASO 0 — Verificación documental del framework cuando corresponda

Si el fix auditado toca cualquiera de estos temas:

- layouts/root layouts
- metadata / routing / i18n del framework
- middleware/proxy/file conventions
- rendering server/client
- caché / revalidate / data fetching
- APIs con comportamiento versionado del framework

entonces es OBLIGATORIO verificar la documentación oficial versionada que está instalada en el proyecto antes de cerrar el hallazgo.

### Checklist documental

1. Detectar si el cambio toca una convención del framework
2. Buscar la doc local/versionada correspondiente
3. Extraer la regla exacta que afecta el hallazgo
4. Citar la doc en la evidencia del reporte
5. Si el código “parece correcto” pero contradice la doc, marcarlo como **PERSISTENTE** o **REGRESIÓN** según corresponda

### Ejemplos donde este paso es obligatorio

- mover `<html>` / `<body>` entre layouts en Next.js
- renombrar `middleware.ts` / `proxy.ts`
- cambios en root layout, route groups o múltiples root layouts
- cambios de metadata o generateMetadata

**Regla:** si el hallazgo depende de una convención del framework y no verificaste docs, NO des el hallazgo por cerrado.

### PASO 1 — Resolver el Baseline de forma confiable

Prioridad estricta para detectar baseline:

1. `Otros/Info_Auditorias/baseline_info.txt`
2. Hash explícito dentro de auditorías o respuestas previas, por ejemplo:
   - `Commit auditado: <hash>`
   - `Snapshot de referencia: <hash>`
3. Heurística por historial git (`audit|baseline`) SOLO como último recurso
4. Si nada de eso existe, detenerse y advertir que no hay baseline confiable

```bash
# 1) Baseline formal
BASELINE_HASH=$(cat /home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/baseline_info.txt 2>/dev/null | grep BASELINE_COMMIT | cut -d'=' -f2)

# 2) Fallback recomendado: parsear hash desde auditorías previas
# Buscar patrones como:
# - Commit auditado: `abc123`
# - Snapshot de referencia: `abc123`

# 3) Último recurso: heurística de git log
if [ -z "$BASELINE_HASH" ]; then
  BASELINE_HASH=$(git log --oneline --all | grep -i "audit\|baseline" | head -1 | awk '{print $1}')
fi
```

**Regla:** si el baseline vino de auditoría/response y no de `baseline_info.txt`, dejarlo explícito en el reporte.

---

### PASO 2 — Detectar el modo real de comparación

NO asumir que todos los cambios están comiteados.

Determinar cuál de estos escenarios aplica:

| Escenario | Qué comparar |
|---|---|
| Hay commits posteriores al baseline y working tree limpio | `BASELINE..HEAD` |
| No hay commits posteriores al baseline pero hay working tree modificado | `git diff BASELINE` |
| Hay commits posteriores y además working tree modificado | reportar ambos: `BASELINE..HEAD` + working tree actual |
| No hay baseline confiable | detenerse y ofrecer opciones |

```bash
# Estado actual
git status --short --branch

# Commits posteriores al baseline
git log --oneline "$BASELINE_HASH"..HEAD

# Cambios visibles contra baseline (incluye working tree)
git diff --name-only "$BASELINE_HASH"
```

**Regla:** el reporte debe aclarar si la verificación se hizo contra commits, working tree o ambos.

---

### PASO 3 — Leer y normalizar auditorías + respuestas del desarrollador

Leer:
- última auditoría de arquitectura relevante
- última auditoría de código relevante
- respuesta del desarrollador para cada una

Para cada hallazgo previo, normalizar esta ficha:

```text
HALLAZGO NORMALIZADO
├── id: [A11Y-03 / BUG-07 / etc]
├── tipo: [a11y|bug|seo|i18n|architecture|dead-code|perf|security]
├── severidad: [CRIT|HIGH|MED|LOW]
├── titulo: [nombre breve]
├── archivos_primarios: [1..n rutas]
├── archivos_secundarios: [opcionales]
├── problema_original: [síntoma]
├── causa_raiz: [si existe]
├── respuesta_desarrollador: [corregido|diferido|falso positivo|no aplica]
├── criterio_cierre: [qué debe ser verdad para marcar RESUELTO]
├── criterio_parcial: [qué situación cuenta como PARCIAL]
└── criterio_regresion: [qué tipo de daño colateral cuenta como REGRESIÓN]
```

### Reglas de normalización

- Si un hallazgo afecta múltiples archivos, verificar el hallazgo como unidad lógica, no archivo aislado.
- Si el desarrollador dijo “corregido”, verificar con estándar más estricto.
- Si el desarrollador dijo “diferido” o “no se corrige ahora”, validar si efectivamente sigue abierto, pero NO tratarlo como incumplimiento oculto.
- Si el desarrollador marcó “falso positivo”, validar si realmente lo era o si la justificación no se sostiene con el código actual.

---

### PASO 4 — Verificar cada hallazgo previo con criterios finos

Para cada hallazgo relevante:

```text
VERIFICACIÓN DE HALLAZGO [ID]
├── Archivo(s): [ruta/s]
├── Problema original: [descripción]
├── Decisión del desarrollador: [corregido|diferido|falso positivo]
├── Severidad: [CRIT|HIGH|MED|LOW]
├── Estado actual: [diff + lectura actual + grep]
└── Resultado:
    ├── ✅ RESUELTO
    ├── ❌ PERSISTENTE
    ├── ⚠️ PARCIAL
    └── 🔶 REGRESIÓN
```

### Criterios de verificación refinados

| Estado | Criterio |
|---|---|
| RESUELTO | El síntoma original desapareció, la causa raíz quedó atendida y no quedan superficies secundarias claramente afectadas |
| PERSISTENTE | El problema original sigue presente o el archivo/sistema relevante no cambió y el hallazgo sigue abierto |
| PARCIAL | Mejoró el síntoma visible, pero la causa raíz sigue viva o quedaron superficies secundarias sin corregir |
| REGRESIÓN | El fix resolvió parte del hallazgo original pero introdujo un bug nuevo, una referencia rota, una inconsistencia nueva o un daño colateral verificable |

### Preguntas obligatorias antes de decidir estado

1. ¿Se corrigió el síntoma visible?
2. ¿Se corrigió la causa raíz?
3. ¿Quedaron atributos invisibles/relacionados aún mal? (`alt`, `aria-label`, metadata, assets, imports, refs)
4. ¿El cambio rompió otra cosa?
5. ¿La respuesta del desarrollador coincide con la evidencia actual?

Si alguna de 2, 3 o 4 falla, NO marcar como RESUELTO sin justificar por qué.

---

### PASO 5 — Detectar issues nuevos y regresiones reales

Revisar archivos modificados desde baseline para detectar issues nuevos o daño colateral.

#### Checklist mínima

- imports sin uso o ramas huérfanas
- nuevos `use client` innecesarios
- hardcodes de contacto o datos sensibles
- nuevas dependencias pesadas
- nuevos `NEXT_PUBLIC_*` expuestos sin necesidad
- assets renombrados/eliminados con referencias vivas
- i18n parcial introducido por el fix
- fixes visuales que dejan a11y o SEO sin cerrar
- metadata corregida en unas rutas pero inconsistente en otras hermanas
- componentes borrados con referencias activas aún presentes

```text
[HALLAZGOS NUEVOS / REGRESIONES]
1. [archivo] — [nuevo problema o daño colateral]
2. [archivo] — [nuevo problema o daño colateral]
```

**Regla:** no reportar issues nuevos como si ya hubieran existido antes del baseline.

---

### PASO 6 — Reportar también persistencias sin cambios

Si un hallazgo previo sigue abierto pero el archivo no fue modificado, reportarlo en:

```markdown
## Archivos Sin Cambios (Siguen con Issues)
- [archivo] — [problema persistente]
```

Esto NO viola el alcance. Solo documenta que el fix prometido nunca tocó ese punto.

**Regla:**
- No usar esos archivos para descubrir issues nuevos no relacionados
- Sí usarlos para cerrar la trazabilidad del hallazgo previo

---

### PASO 7 — Generar Delta Report con trazabilidad explícita

Crear el archivo:

```bash
VERIFICATION_FILE="/home/server/Escritorio/mascercaap/mas-cerca-ap/Otros/Info_Auditorias/verification_$(date +'%Y%m%d_%H%M').md"
```

### PASO 8 — Declarar riesgos no validados por ejecución

Si por restricciones del proyecto NO se puede correr build, tests, lint, navegador o validación runtime, el reporte debe incluir explícitamente qué cosas quedaron verificadas solo por evidencia estática.

Esto aplica especialmente a:

- layouts/root layouts
- errores de build potenciales
- hidratación
- navegación cross-root-layout
- imports dinámicos y SSR
- comportamiento runtime de providers, drawers, modales o analytics

**Regla:** no fingir certeza ejecutable si no hubo ejecución real.

---

## Formato de Reporte de Verificación V2.1

```markdown
# Verificación de Auditoría — [FECHA]

## Metadatos
- **Tipo:** Verificación Post-Auditoría
- **Fecha:** [FECHA]
- **Artefactos previos leídos:** [LISTA]
- **Auditorías verificadas:** [REFS]
- **Respuestas consideradas:** [REFS]
- **Baseline / Snapshot:** [BASELINE_HASH]
- **Fuente del baseline:** [baseline_info|auditoría previa|respuesta previa|heurística git]
- **Modo de comparación:** [baseline..HEAD|working tree vs baseline|ambos]
- **Working tree al iniciar:** [limpio|modificado]
- **Verificador:** software-audit-verifier v2.1

## Resumen de Cambios
- Archivos modificados desde baseline: [COUNT]
- Hallazgos verificados: [COUNT]
- ✅ Resueltos: [COUNT]
- ❌ Persistentes: [COUNT]
- ⚠️ Parciales: [COUNT]
- 🔶 Regresiones: [COUNT]
- 🆕 Nuevos issues: [COUNT]

## Matriz de Trazabilidad
| Hallazgo | Decisión del desarrollador | Estado final | Evidencia corta |
|---|---|---|---|
| A11Y-03 | Corregir | RESUELTO | `<div>` → `<button>` |
| BUG-07 | Corregir | PARCIAL | visible ok, alt/ingredientes siguen mal |

## Detalle por Hallazgo

### [ID] — [Título del Hallazgo]
- **Severidad:** [CRIT|HIGH|MED|LOW]
- **Archivo(s):** [rutas]
- **Decisión del desarrollador:** [corregido|diferido|falso positivo|sin respuesta]
- **Estado:** RESUELTO|PERSISTENTE|PARCIAL|REGRESIÓN
- **Evidencia:** [diff, lectura actual, grep, referencia rota, etc]

## Nuevos Issues Detectados
- [NUEVO] [ID] — [Descripción]

## Regresiones Detectadas
- [REGRESIÓN] [ID] — [Descripción]

## Archivos Sin Cambios (Siguen con Issues)
- [archivo] — [problema persistente]

## Riesgos no validados por ejecución
- [hallazgo o cambio] — [qué no se pudo validar sin build/test/runtime]
- [hallazgo o cambio] — [por qué la conclusión depende de evidencia estática + docs]

## Recomendaciones
1. Prioridad de fixes restantes
2. Qué cerrar YA por riesgo funcional
3. Qué mover a refactor estructural
4. Si hace falta re-auditoría o no
```

---

## Caso Especial: Sin Baseline Previo

Si no existe baseline confiable:

1. **Advertir** explícitamente al usuario
2. **Ofrecer dos opciones:**
   - Crear baseline formal ahora y usarlo a futuro
   - Hacer verificación limitada sobre últimos N commits / working tree actual
3. **Nunca fingir precisión** si el baseline no es confiable

### Importante

Si se propone crear baseline, NO asumir commit automático sin permiso del usuario.
Solo sugerirlo.

---

## Restricciones (Red Lines)

```text
❌ NO convertir la verificación en auditoría full del repo
❌ NO reportar como "resuelto" un fix que dejó la causa raíz viva
❌ NO reportar issues nuevos como si ya existieran antes
❌ NO ignorar working tree modificado por no estar comiteado
❌ NO ignorar la respuesta del desarrollador
❌ NO cerrar hallazgos de framework sin verificar documentación versionada
❌ NO modificar código durante la verificación — SOLO reportar
```

---

## Escalado

Si durante la verificación se detectan:

- **Regresiones críticas** → sugerir auditoría de código completa
- **Nuevos issues de seguridad** → sugerir auditoría de seguridad inmediata
- **Más de 30% de hallazgos persistentes** → sugerir re-auditoría en 1 semana
- **Muchos parciales en fixes “supuestamente cerrados”** → sugerir revisión de criterio de aceptación del equipo

---

## Integración con SDD

Si el proyecto usa Spec-Driven Development:

1. Leer tasks completados desde el último ciclo
2. Verificar implementación contra hallazgos previos
3. Comparar respuesta del desarrollador vs evidencia actual
4. Usar el delta report como entrada para la próxima iteración SDD

---

## Recursos

- **LECCIONES_APRENDIDAS.md** → contexto histórico y causas raíz
- **Otros/Info_Auditorias/baseline_info.txt** → baseline formal
- **Otros/Info_Auditorias/audit_*.md** → auditorías previas
- **Otros/Info_Auditorias/Respuesta-audit_*.md** → decisiones y promesas del desarrollador
- **Otros/Info_Auditorias/verification_*.md** → verificaciones anteriores
- **Git** → commits, working tree y diff exacto contra baseline
- **Docs locales del framework** → verificación versionada de convenciones antes de cerrar hallazgos

---

## Nota Operativa del Entorno

Si durante la ejecución detectás que el **loader de skills** devuelve contenido distinto al archivo en disco (`SKILL.md`), tratá eso como un riesgo operativo del entorno.

### Qué hacer

1. Leer el archivo `SKILL.md` directamente desde disco
2. Comparar la versión cargada vs la versión en archivo
3. Si hay discrepancia, dejarlo explícito en el reporte:

```markdown
## Observación Operativa
- El loader de skill devolvió una versión distinta a la presente en disco.
- La verificación se ejecutó siguiendo el contenido del archivo `SKILL.md` leído directamente.
```

**Regla:** una skill no puede considerarse operacionalmente confiable si el entorno carga una versión distinta a la vigente en disco.
