---
name: software-audit-orchestrator
description: >
  Orquestador de auditorías. Ejecuta el pipeline completo:
  código → arquitectura → producto → reporte consolidado.
  Gestiona el PASO 0 una sola vez y pasa contexto entre skills.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.1"
---

## When to Use

- "auditar completa", "auditar todo", "ejecutar pipeline completo"
- Necesidad de reporte consolidado multi-dominio
- Pre-deploy check que cubra todas las dimensiones
- El usuario no especifica qué tipo de auditoría → pipeline completo

## Qué NO hace

```
NO audita código → software-code-auditor
NO audita arquitectura → software-architecture-auditor
NO audita producto → software-product-auditor
NO verifica fixes → software-audit-verifier
```

**Única responsabilidad: pipeline, contexto, consolidación.**

## Metodología — Pipeline de 6 Fases

### FASE 0A — PASO 0 (Shared Baseline + Trazabilidad)
Ejecutar: `source .agents/skills/shared/scripts/resolve-baseline.sh`
Esto genera variables: `BASELINE_HASH`, `DIFF_MODE`, `WORKTREE_STATE`, `BRANCH`.

### FASE 0B — Build + Tests (OBLIGATORIO)
Ejecutar:
```bash
npm run build 2>&1 | tail -30; BUILD_EXIT=$?
npm test 2>&1 | tail -30; TEST_EXIT=$?
npm run lint 2>&1 | tail -30; LINT_EXIT=$?
```
Si `BUILD_EXIT != 0` → pipeline se detiene con hallazgo CRIT.
Si `TEST_EXIT != 0` → hallazgo HIGH registrado en consolidado.

### FASE 0C — Indexado Único
Ejecutar: `bash .agents/skills/shared/scripts/audit-context.sh`
Genera `.opencode/audit-context.json` con estructura del proyecto (use_client list, i18n keys, deps).

### FASE 1 — Auditoría de Código
Cargar `software-code-auditor`. Pasar contexto + `.opencode/audit-files.json`.
Al finalizar: leer `Otros/Info_Auditorias/audit_code_*.json` para extraer hallazgos.

### FASE 2 — Auditoría de Arquitectura
Cargar `software-architecture-auditor`. Pasar contexto + hallazgos de FASE 1.
Al finalizar: leer `Otros/Info_Auditorias/audit_architecture_*.json`.

### FASE 3 — Auditoría de Producto
Cargar `software-product-auditor`. Pasar contexto + hallazgos de FASE 1 y 2.
Al finalizar: leer `Otros/Info_Auditorias/audit_product_*.json`.

### FASE 4 — Reporte Consolidado
Ejecutar: `shared/scripts/consolidate.sh`
Input: 3 JSONs de hallazgos. Output: consolidated .md + .json.

## Input Contract

| Contexto | Generado por |
|---|---|
| Baseline, diff, worktree | FASE 0A (resolve-baseline.sh) |
| Build/test/lint status | FASE 0B |
| Proyecto indexado | FASE 0C (audit-context.sh) |
| Hallazgos code | FASE 1 |
| Hallazgos arch | FASE 2 |
| Hallazgos prod | FASE 3 |

## Output Contract

`Otros/Info_Auditorias/audit_consolidated_YYYYMMDD_HHMM.md` (+ .json)

Generado vía: `shared/scripts/consolidate.sh`
