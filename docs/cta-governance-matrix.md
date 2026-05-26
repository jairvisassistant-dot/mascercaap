# Matriz de gobernanza de CTAs

## Objetivo

Definir una única fuente de verdad para la jerarquía de CTAs por página y por bloque. La regla base es simple: **un solo CTA primario por bloque**. Todo lo demás debe degradar a secundario o terciario.

## Fuente de verdad en código

- `lib/cta-governance.ts`

## Reglas operativas

1. Cada bloque tiene un único objetivo de conversión.
2. Si existe un CTA de ayuda dentro del mismo tramo visual, ese CTA NO puede competir visualmente con el principal.
3. Si una página necesita varios caminos, se resuelven con jerarquía visual (`primary`, `secondary`, `tertiary`), no con múltiples primarios.
4. Nuevos CTAs requieren actualización de esta matriz antes de merge.

## Matriz actual

| Ruta | Bloque | Objetivo | CTA primario | Secundarios permitidos |
|---|---|---|---|---|
| `/[lang]` | Home — cierre | Abrir conversación comercial | WhatsApp / Start order | Ninguno |
| `/[lang]/productos` | Banner de ayuda rápida | Resolver dudas rápidas | Ninguno visualmente primario; CTA secundario a WhatsApp | WhatsApp |
| `/[lang]/productos` | Cierre comercial | Llevar a contacto/cotización | Ir a contacto | Ninguno |
| `/[lang]/nosotros` | CTA institucional | Convertir confianza en contacto | Ir a contacto | Ninguno |
| `/[lang]/contacto` | Formulario principal | Enviar solicitud | Enviar solicitud | WhatsApp fallback |
| `/[lang]/terminos` | Contacto legal | Resolver dudas legales | Ir a contacto | Email |
| `/[lang]/politicas` | Contacto legal | Resolver dudas de privacidad | Ir a contacto | Email |

## Estado de implementación

- **Productos:** corregido el conflicto visual principal/secundario. `WhatsAppCTABanner` quedó como secundario y `ProductsClosingCTA` se mantiene como primario.
- **Resto del sitio:** alineado a nivel de intención general; futuras revisiones deben contrastar cada bloque con esta matriz.

## Checklist para PR

- [ ] El bloque nuevo o modificado tiene un solo CTA primario.
- [ ] Los CTAs secundarios no compiten por color, peso o tamaño con el principal.
- [ ] La ruta/bloque fue agregado o actualizado en `lib/cta-governance.ts`.
- [ ] Si cambia el objetivo de conversión, también cambia la documentación de analytics/KPI.
