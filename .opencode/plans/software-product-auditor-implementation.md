# Plan de Implementación: software-product-auditor

## Archivo destino
`.agents/skills/software-product-auditor/SKILL.md`

## Contenido completo del SKILL.md

```markdown
---
name: software-product-auditor
description: >
  Auditoría de calidad de producto digital: identidad visual, UX, contenido,
  responsive design, microinteracciones, credibilidad y privacidad legal.
  Complementa las auditorías de código y arquitectura evaluando el sitio como
  activo de negocio. Trigger: "auditar producto", "revisar UX", "evaluar diseño",
  "calidad visual", "revisar contenido", "problemas UI/UX", "identidad de marca",
  "credibilidad", "auditoría de producto".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## 1. When to Use

- Solicitud de "auditar producto" o "revisar UX / UI"
- Evaluación de "identidad visual" o "diferenciación de marca"
- Análisis de "contenido", "propuesta de valor" o "tono"
- Revisión de "responsive design" o "experiencia móvil"
- Evaluación de "microinteracciones" y "propósito de animaciones"
- Análisis de "credibilidad", "confianza" o "transparencia"
- Revisión de "privacidad legal", "consentimiento" o "ética"
- Detección de patrones genéricos de IA en el producto (anti-AI-slop)
- Complemento natural antes o después de auditorías de código/arquitectura

## 2. Exclusiones (NO auditar)

```
node_modules/          → excluir
.next/                 → excluir
public/                → solo verificar robots.txt
.env.local             → excluir (seguridad)
sanity/schemas/        → excluir (CMS, fuera de alcance)
scripts/migrate*.ts    → exclude (script one-time)
```

**Áreas delegadas a otras skills:**

| Área | Skill responsable |
|---|---|
| Seguridad técnica (API keys, XSS, validación Zod) | software-code-auditor (CAT-1) |
| Accesibilidad WCAG (contraste, keyboard, screen reader) | software-code-auditor (CAT-6) |
| SEO técnico (sitemap, robots, metadata, canonical) | software-architecture-auditor (PASO 7) |
| Bundle / performance / rendering | software-architecture-auditor (PASOS 2-5) |
| Bugs, imports, TypeScript, código muerto | software-code-auditor (PASOS 2-6) |
| Estrategia i18n y formato de rutas | software-architecture-auditor (PASO 8) |
| Verificación post-fix | software-audit-verifier |

## 3. Patrón Compartido Aplicable

Antes de interpretar baseline, delta, working tree o trazabilidad, aplicar:

- `.agents/skills/shared-audit-baseline-traceability.md`

Este archivo define el contrato común. Esta skill solo agrega las reglas específicas de auditoría de producto digital.

## 4. Input Requerido (OBLIGATORIO antes de auditar)

Antes de emitir el primer hallazgo, revisar SIEMPRE en este orden:

1. **LECCIONES_APRENDIDAS.md** → causas raíz, deuda conocida y convenciones del proyecto
2. **Otros/Info_Auditorias/** → artefactos previos:
   - `baseline_info.txt`, `baseline_structure.txt`, `baseline_dependencies.txt`
   - `audit_code_*.md`, `audit_architecture_*.md`, `audit_product_*.md`
   - `Respuesta-audit_code_*.md`, `Respuesta-audit_architecture_*.md`, `Respuesta-audit_product_*.md`
   - `verification_*.md`
3. **Git state actual** → branch, tracking remoto, commits, working tree, diff vs baseline
4. **Docs locales del framework** cuando el hallazgo dependa de convenciones versionadas

**Regla:** si existe historial en `Otros/Info_Auditorias/` y no se leyó, la auditoría está incompleta.

## 5. PASO 0 — Contexto, Baseline y Trazabilidad

### 0A — Leer Historial de Auditorías

Objetivo: no reabrir hallazgos de producto ya aceptados como deuda, no reciclar diagnósticos previos.

Checklist:
1. Leer LECCIONES_APRENDIDAS.md
2. Leer últimos audit_product_*.md y audit_architecture_*.md relevantes
3. Leer respuestas del desarrollador asociadas
4. Leer últimas verification_*.md si existen
5. Contrastar con audit_code_*.md si un hallazgo de producto depende de un problema de código
6. Registrar qué artefactos previos fueron considerados

### 0B — Resolver Baseline

Prioridad:
1. `baseline_info.txt`
2. Hash explícito en auditorías/respuestas previas
3. HEAD actual como snapshot lógico
4. Heurística git (audit|baseline) como último recurso

```bash
git status --short --branch
BASELINE_HASH=$(cat Otros/Info_Auditorias/baseline_info.txt 2>/dev/null | grep BASELINE_COMMIT | cut -d'=' -f2)
if [ -z "$BASELINE_HASH" ]; then
  BASELINE_HASH=$(git log --oneline --all | grep -i "audit\|baseline" | head -1 | awk '{print $1}')
fi
```

### 0C — Detectar modo de comparación

| Escenario | Comparación |
|---|---|
| Baseline + commits + working tree limpio | BASELINE..HEAD |
| Baseline + sin commits + working tree modificado | git diff BASELINE |
| Baseline + commits + working tree modificado | ambos |
| Sin baseline | repo actual completo + advertencia |

### 0D — Validar trazabilidad Git/GitHub
- Git local OK → se puede auditar y comitear localmente
- gh auth OK → además trazabilidad remota opcional
- Git local roto → detenerse

### 0E — Baseline commit formal (OPCIONAL, solo con permiso explícito del usuario)

### 0F — Generar archivo de contexto baseline en Info_Auditorias

### 0G — Crear archivo de informe vacío
`Otros/Info_Auditorias/audit_product_YYYY-MM-DD_HHMM.md`

## 6. Metodología de Auditoría — 7 Pasos

### PASO 1 — Identidad Visual y Diferenciación de Marca

**Objetivo:** Detectar si el sitio comunica una identidad propia o es indistinguible de una plantilla genérica de IA.

**1A — Hero y first fold**
- ¿Comunica propuesta de valor en ≤5 segundos?
- ¿El título es específico del negocio o genérico?
- ¿Hay gradientes azul/morado, negro/neón sin justificación de marca?

**1B — Paleta de color**
- ¿Colores con justificación de marca o defaults del framework?
- ¿Coherencia cromática entre secciones?
- ¿Gradientes intencionales o decorativos?

**1C — Tipografía**
- ¿Sistema tipográfico claro (max 2 familias)?
- ¿Jerarquía consistente o tamaños arbitrarios?
- ¿"Serif instrument style", mayúsculas forzadas?

**1D — Cards y componentes visuales**
- ¿Jerarquía real o todas idénticas con bordes redondeados y sombra?
- ¿Bento boxes con lógica de contenido o decorativas?
- ¿Iconografía con emojis genéricos?

**1E — Consistencia global**
- ¿Botones, espaciados, títulos, formularios mantienen un sistema coherente?
- ¿El diseño guía al usuario o solo impresiona?

**Formato de hallazgo:**
```
[SEVERIDAD] VIS-N — Elemento/Sección
Síntoma: problema visual
Impacto: dilución de identidad, percepción de baja calidad
Recomendación: cambio concreto
```

### PASO 2 — UX, Flujo de Navegación y Conversión

**2A — CTA principal**
- ¿Visible y repetido estratégicamente?
- ¿Texto específico ("Solicitar cotización") vs genérico ("Saber más")?

**2B — Menú y navegación**
- ¿≤5-7 opciones principales?
- ¿Etiquetas claras y no ambiguas?
- ¿Rutas duplicadas?

**2C — Flujo de usuario (journey mapping)**
```
Entrada → Información → Confianza → Acción
```
¿Dónde se rompe el flujo?

**2D — Formularios**
- ¿Campos mínimos necesarios?
- ¿Labels visibles (no solo placeholder)?
- ¿Mensajes de error específicos?
- ¿Validación inline?

**2E — Patrones anti-UX de IA**
- Formularios largos "por si acaso"
- CTAs duplicados que compiten
- Secciones sin función en el journey

**Formato:**
```
[SEVERIDAD] UX-N — Componente/Flujo
Síntoma: qué experimenta el usuario
Impacto en conversión: abandono, confusión
Recomendación: cambio concreto
```

### PASO 3 — Contenido, Propuesta de Valor y Tono

**3A — Propuesta de valor**
- ¿Explica QUÉ problema, PARA QUIÉN y POR QUÉ es diferente?
- ¿Frases tipo "solución innovadora" sin respaldo?

**3B — Calidad del contenido**
Clasificar cada bloque: Mantener | Mejorar | Reescribir | Eliminar

**3C — Tono y autenticidad**
- ¿Suena humano o artificial/excesivamente positivo?
- ¿"Felicidad falsa"?

**3D — Veracidad**
- ¿Afirmaciones, cifras, estudios verificables?
- ¿Precios, tamaños, ingredientes correctos?
- ¿Copyright actualizado?

**3E — Repetición**
- ¿Secciones que dicen lo mismo?
- ¿Cada sección responde una duda real?

**Formato:**
```
[SEVERIDAD] CONT-N — Sección/Archivo
Síntoma: texto problemático
Impacto: confusión, desconfianza
Recomendación: reescritura o verificación
```

### PASO 4 — Responsive Design y Experiencia Móvil

**4A — Hero móvil**
- ¿Ocupa demasiado espacio?
- ¿Título y CTA legibles sin zoom?
- ¿Imágenes no se cortan?

**4B — Menú móvil**
- ¿Hamburguesa claro y fácil de cerrar?
- ¿Targets ≥44x44px?

**4C — Cards en viewport pequeño**
- ¿No quedan demasiado angostas?
- ¿Textos no se truncan?
- ¿Sin scroll horizontal?

**4D — Formularios móvil**
- ¿Inputs con type correcto (tel, email, number)?
- ¿Botones con tamaño táctil suficiente?

**4E — Touch targets**
- ¿Mínimo 44x44px?
- ¿Hover states con equivalente táctil?

**Formato:**
```
[SEVERIDAD] RSP-N — Componente/Breakpoint
Síntoma: comportamiento en [móvil|tablet|escritorio]
Impacto: frustración, abandono
Recomendación: ajuste CSS o layout condicional
```

### PASO 5 — Microinteracciones, Animaciones y Propósito de Movimiento

**5A — Propósito de cada animación**
Solo válidas si cumplen AL MENOS UNA:
- Confirmar acción
- Guiar atención
- Mostrar cambio de estado
- Mejorar comprensión
- Reducir incertidumbre

**5B — Patrones problemáticos de IA**
- Scroll-jacking
- Efectos de cursor
- Fade-ins sin relación con scroll
- Hover excesivo
- Movimiento continuo sin función

**5C — Performance**
- ¿Usan transform/opacity (GPU) o causan layout thrashing?
- ¿Podrían ser CSS en lugar de JS?

**5D — Accesibilidad de movimiento**
- ¿Respeta prefers-reduced-motion?
- ¿Botón para pausar animaciones?
- ¿Autoplay se pausa con IntersectionObserver?

**Formato:**
```
[SEVERIDAD] MIC-N — Componente/Animación
Síntoma: movimiento problemático
Impacto: distracción, mareo, barrera de accesibilidad
Recomendación: eliminar, reemplazar con CSS, condicionar
```

### PASO 6 — Credibilidad, Confianza y Transparencia

**6A — Quién está detrás**
- ¿Empresa/persona/equipo visible?
- ¿Fotos reales o generadas por IA?

**6B — Contacto**
- ¿Información completa y verificable?
- ¿Datos vienen de SITE_CONFIG?

**6C — Pruebas sociales**
- ¿Testimonios auténticos o genéricos?
- ¿Casos de uso, clientes reales?

**6D — Señales de legalidad**
- ¿NIT/RUC visible?
- ¿Copyright actualizado?
- ¿Políticas adaptadas al proyecto?

**6E — Autenticidad**
- ¿Imágenes generadas sin contexto?
- ¿Promesas realistas?

**Formato:**
```
[SEVERIDAD] CRE-N — Sección/Componente
Síntoma: elemento que resta confianza
Impacto: desconfianza, no conversión
Recomendación: añadir, corregir o eliminar
```

### PASO 7 — Privacidad Legal, Consentimiento y Ética

**Límite:** No cubre seguridad técnica (code auditor CAT-1). Solo capa legal y ética.

**7A — Cookies y consentimiento**
- ¿Banner visible?
- ¿Consentimiento previo a scripts?
- ¿Clasificación por tipo?
- ¿Posibilidad de rechazar?

**7B — Política de privacidad**
- ¿Existe y está adaptada al proyecto real?
- ¿Explica qué datos, para qué, con quién, por cuánto tiempo?
- ¿Derechos ARCO o equivalentes?

**7C — Términos y condiciones**
- ¿Existen? ¿Cubren uso, responsabilidades, propiedad intelectual?
- ¿Actualizados con legislación colombiana?

**7D — Transparencia de IA**
- ¿Contenido generado por IA se declara?
- ¿Riesgo de confundir IA con humano?

**7E — Sesgos**
- ¿Imágenes con diversidad realista?
- ¿Sesgos perceptibles (género, raza, clase)?

**Formato:**
```
[SEVERIDAD] LEG-N — Página/Script
Síntoma: incumplimiento legal/ético
Impacto: riesgo legal, multas, desconfianza
Recomendación: acción legal o técnica concreta
```

## 7. Formato de Reporte

### Por hallazgo:
```
[SEVERIDAD] ID-PROD — Componente/Sección
Síntoma: qué ve el usuario
Impacto: cómo afecta conversión, confianza o percepción
Recomendación: cambio concreto
```

### Hallazgo referido:
```
[REFERIDO] [SEVERIDAD] → software-[code|architecture]-auditor
Área: [descripción]
Motivo: [por qué no se profundiza aquí]
```

### Resumen final:
1. Tabla por categoría con conteo y severidad
2. Top 5 issues por impacto en conversión/confianza
3. Hallazgos referidos a otras skills
4. Coordinación cross-skill

## 8. SALIDA — Guardar Informe

Mismo patrón que las skills hermanas: `Otros/Info_Auditorias/audit_product_YYYY-MM-DD_HHMM.md`

Template de reporte:

```markdown
# Auditoría de Producto — [FECHA]

## Metadatos
- **Tipo:** Producto
- **Fecha:** [FECHA]
- **Baseline / Snapshot:** [HASH]
- **Fuente del baseline:** [fuente]
- **Modo de comparación:** [modo]
- **Artefactos previos leídos:** [lista]
- **Auditor:** software-product-auditor v1.0
- **Commits desde baseline:** [N]

## Estado Pre-Auditoría
- Baseline: [HASH]
- Fecha baseline: [FECHA]
- Working tree: [limpio|modificado]
- Archivos en scope: [N]

## Hallazgos Detallados
### Identidad Visual (VIS)
- ...
### UX y Navegación (UX)
- ...
### Contenido (CONT)
- ...
### Responsive (RSP)
- ...
### Microinteracciones (MIC)
- ...
### Credibilidad (CRE)
- ...
### Privacidad Legal (LEG)
- ...

## Hallazgos Referidos
- → software-code-auditor: ...
- → software-architecture-auditor: ...

## Resumen Ejecutivo
- Total: [N] | CRIT: [N] | HIGH: [N] | MED: [N] | LOW: [N]
- VIS: [N] | UX: [N] | CONT: [N] | RSP: [N] | MIC: [N] | CRE: [N] | LEG: [N]

## Top 5 Issues de Producto
1. ...

## Coordinación Cross-Skill
- Consistencia con code/architecture audits: ...
- Recomendación: ...
```

## 9. Escala de Severidad (idéntica a skills hermanas)

| Nivel | Código | Descripción |
|-------|--------|-------------|
| Crítico | 🔴 CRIT | Impide conversión, desconfianza inmediata, incumplimiento legal |
| Alto | 🟠 HIGH | Impacto significativo en experiencia, marca o conversión |
| Medio | 🟡 MED | Subóptimo pero no bloqueante |
| Bajo | 🟢 LOW | Mejora incremental sin urgencia |
| Info | ℹ️ INFO | Observación estratégica |

## 10. Coordinación Cross-Skill

- **software-code-auditor**: No duplicar SEC ni A11Y. Derivar hallazgos con causa raíz en código.
- **software-architecture-auditor**: No duplicar SEO técnico, bundle, rendering. Derivar hallazgos con causa raíz arquitectural.
- **software-audit-verifier**: Mismo formato de reporte → verifica sin cambios.
- **design-taste-frontend, high-end-visual-design, gpt-taste, minimalist-ui, etc.**: Product-auditor diagnostica; estas skills implementan la solución visual.

### Flujo recomendado:
```
1. software-code-auditor      → bugs, seguridad, a11y
2. software-architecture-auditor → stack, bundle, SEO técnico
3. software-product-auditor   → identidad visual, UX, contenido, responsive, microinteracciones, credibilidad, privacidad
4. software-audit-verifier    → verifica fixes de las 3 auditorías
```

## 11. Restricciones (Red Lines)

```
❌ NO duplicar seguridad, accesibilidad técnica o SEO técnico cubiertos por otras skills
❌ NO profundizar en código — solo identificar síntoma visible de producto
❌ NO sugerir implementación que corresponda a skills de diseño visual
❌ NO dar aprobaciones genéricas sin checklist aplicada
❌ NO ignorar contenido factualmente incorrecto
❌ NO asumir commit baseline automático ni commit automático del reporte
❌ NO bloquear por falta de GitHub si Git local funciona
```

## 12. Recursos

- LECCIONES_APRENDIDAS.md → causas raíz del proyecto (sección UX/producto)
- messages/es.json, messages/en.json → tono y consistencia i18n
- app/ → rutas (journey de usuario)
- components/ → componentes visuales
- public/imgs/ → imágenes (credibilidad, responsive)
- lib/config.ts → contacto (verificar contra lo visible)
- data/ → catálogo (verificar contra claims)
```

## Acciones necesarias

1. Escribir este contenido en `.agents/skills/software-product-auditor/SKILL.md`
2. El directorio ya fue creado (`.agents/skills/software-product-auditor/`)
3. No requiere cambios en skills existentes — la skill se integra vía `shared-audit-baseline-traceability.md` y su formato de reporte compatible
