# CSP hardening playbook

## Objetivo

Pasar de una CSP "configurada" a una CSP **operable y endurecible por fases**, con visibilidad de violaciones antes de endurecer reglas que puedan romper runtime.

## Estado actual

- Política bloqueante activa desde `next.config.ts`.
- Endpoint receptor en `/api/csp-report`.
- Persistencia operativa en Supabase: `csp_violation_reports`.
- Política objetivo en `Content-Security-Policy-Report-Only` para producción.

## Fases

### Fase 0 — Baseline estable
- Mantener política actual de enforcement.
- Confirmar que no rompe navegación, formularios, admin ni drawers.

### Fase 1 — Observabilidad
- Activar `Content-Security-Policy-Report-Only` en producción con una política más estricta.
- Persistir reportes para inspección histórica.
- Revisar top directivas violadas semanalmente.

### Fase 2 — Limpieza
- Remover orígenes no usados.
- Reducir scripts/styles inline evitables.
- Verificar QR/admin, analytics y embeds antes de endurecer.

### Fase 3 — Endurecimiento
- Promover a enforcement solo aquello que haya permanecido estable en report-only.
- Evaluar nonces/hashes si aparecen inline scripts inevitables.

## Operación semanal

1. Revisar `/admin/configuracion/csp`.
2. Detectar las 3 directivas con más ruido.
3. Separar falsos positivos de violaciones reales.
4. Convertir cada causa raíz en ticket concreto.
5. Endurecer solo cuando 7 días consecutivos estén estables.

## Criterio de cierre

- Existe visibilidad persistente de violaciones.
- Existe política objetivo explícita en `Report-Only`.
- Hay una rutina operativa para promover endurecimientos sin romper UX.
