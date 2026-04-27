# Patrón Compartido — Baseline y Trazabilidad para Auditorías

Este documento define el contrato común para skills de auditoría y verificación del proyecto.

## Objetivo

Mantener un lenguaje operativo único para:

- contexto histórico
- baseline
- delta real
- working tree
- trazabilidad Git / GitHub
- reportes sin commits automáticos

En una línea:

> **contexto primero, baseline explícito, delta real, cero commits automáticos**

---

## 1. Input mínimo obligatorio

Antes de auditar o verificar, revisar en este orden:

1. `LECCIONES_APRENDIDAS.md`
2. `Otros/Info_Auditorias/`
   - `baseline_info.txt`
   - `baseline_structure.txt`
   - `baseline_dependencies.txt`
   - `audit_code_*.md`
   - `audit_architecture_*.md`
   - `Respuesta-audit_code_*.md`
   - `Respuesta-audit_architecture_*.md`
   - `verification_*.md`
3. Estado Git actual
   - branch
   - tracking remoto
   - commits
   - working tree
   - diff contra baseline si existe
4. Documentación local/versionada del framework cuando el hallazgo dependa de una convención instalada

**Regla:** si existe historial en `Otros/Info_Auditorias/` y no se leyó, la conclusión queda incompleta.

---

## 2. Resolución de baseline

Resolver baseline con esta prioridad:

1. `Otros/Info_Auditorias/baseline_info.txt`
2. Hash explícito en auditorías o respuestas previas
   - `Commit auditado: <hash>`
   - `Snapshot de referencia: <hash>`
3. `HEAD` actual como snapshot lógico
4. Heurística `git log` (`audit|baseline`) como último recurso

### Regla de reporte

Si el baseline no vino de `baseline_info.txt`, declarar la fuente explícitamente en el informe.

---

## 3. Detección del delta real

Nunca asumir que todos los cambios están comiteados.

| Escenario | Comparación |
|---|---|
| Baseline confiable + commits posteriores + working tree limpio | `BASELINE..HEAD` |
| Baseline confiable + sin commits posteriores + working tree modificado | `git diff BASELINE` |
| Baseline confiable + commits posteriores + working tree modificado | ambos |
| Sin baseline confiable | repo actual completo + advertencia |

### Regla de reporte

El informe debe declarar si se trabajó sobre:

- `baseline..HEAD`
- working tree vs baseline
- repo actual completo
- combinación de los anteriores

---

## 4. Trazabilidad Git vs GitHub

**Commit local NO requiere conexión a GitHub.**

Separar siempre:

### Git local

- determina si el repo es auditable y comiteable localmente
- permite snapshot, diff y trazabilidad local

### GitHub / `gh`

- solo suma para push, PR, issues o trazabilidad remota
- NO es prerequisito para auditar ni para commit local

### Regla crítica

No bloquear auditoría ni commit local por falta de auth de GitHub si Git local funciona.

---

## 5. Política de commits

### Permitido

- commit baseline formal SOLO con permiso explícito del usuario
- commit de informe SOLO con permiso explícito del usuario

### Prohibido

- commit automático por default
- asumir que un baseline formal siempre requiere commit nuevo
- confundir `gh auth status` con capacidad de commit local

---

## 6. Contrato mínimo del reporte

Todo reporte de auditoría o verificación debe explicitar:

- baseline o snapshot usado
- fuente del baseline
- modo de comparación
- artefactos previos leídos
- estado del working tree al inicio
- riesgos no validados por ejecución, si aplica

---

## 7. Convenciones de interpretación

- deuda aceptada/documentada NO debe reaparecer como “issue nuevo”
- falsos positivos previos deben respetarse salvo evidencia nueva
- working tree modificado también cuenta como realidad verificable
- si un hallazgo depende del framework, contrastar contra docs versionadas instaladas

---

## 8. Cómo usar este patrón

- `software-code-auditor` lo usa para auditoría full con trazabilidad histórica
- `software-audit-verifier` lo usa para verificación delta post-auditoría
- otras skills de auditoría deberían referenciar este archivo antes de redefinir baseline/trazabilidad
