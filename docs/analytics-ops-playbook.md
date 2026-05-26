# Analytics ops playbook

## Objetivo

Transformar la captura de eventos en un proceso real de optimización comercial.

## Fuente de datos

- Tabla base: `analytics_events`
- Vistas KPI:
  - `v_funnel_summary`
  - `v_daily_events`
  - `v_page_views_by_path`
  - `v_whatsapp_conversion_daily`
  - `v_product_views`
- Panel operativo: `/admin/analytics`

## KPI oficiales

| KPI | Fórmula | Fuente | Frecuencia |
|---|---|---|---|
| Tráfico total | suma de `page_view` | `v_funnel_summary` | semanal |
| Aperturas de ayuda | total `helphub_open` | `v_funnel_summary` | semanal |
| Clicks a WhatsApp | total `cta_whatsapp` | `v_funnel_summary` | semanal |
| Conversión a WhatsApp | `cta_whatsapp / page_view * 100` | `v_whatsapp_conversion_daily` | diaria/semanal |
| Interés por producto | ranking por línea/presentación | `v_product_views` | semanal |
| Páginas más vistas | ranking de rutas | `v_page_views_by_path` | semanal |

## Ritual operativo

### Revisión semanal
1. Abrir `/admin/analytics`.
2. Comparar los últimos 7 días contra la semana anterior.
3. Detectar una sola oportunidad principal:
   - baja conversión a WhatsApp,
   - alto tráfico sin contacto,
   - productos con mucho interés pero poca salida.
4. Proponer una hipótesis.
5. Ejecutar un cambio pequeño y medible.

### Ejemplos de hipótesis válidas
- Cambiar copy del CTA final de productos.
- Mover CTA secundario para reducir competencia visual.
- Ajustar bloque de confianza antes del CTA en contacto.

## Regla de decisión

No se cambian CTAs “por intuición” si ya existe señal en analytics. Primero se observa el panel, después se decide.

## Criterio de cierre

- El equipo puede abrir un panel real.
- Hay KPI definidos y compartidos.
- Existe una rutina explícita para tomar decisiones con esos datos.
