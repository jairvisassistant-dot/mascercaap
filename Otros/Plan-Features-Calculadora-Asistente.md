# Plan de Implementación: Calculadora de Rendimiento + Asistente de Pedido Guiado

**Fecha:** 2026-05-03  
**Versión:** 3 — arquitectura completa con infraestructura real  
**Branch activo actual:** `feat/yield-calculator`

---

## Estado General del Plan

| Sesión | Feature | Estado | Branch | Commit |
|---|---|---|---|---|
| Sesión 1 | Feature A — motor + componentes | ✅ COMPLETADA | `feat/yield-calculator` | `b15fe60` |
| Sesión 2 | Feature A — integración home + PR | 🔄 EN CURSO | `feat/yield-calculator` | — |
| Sesión 3 | Feature B MVP — HelpHub + API + CTA | ⏳ PENDIENTE | `feat/order-assistant` | — |
| Sesión 4 | Feature B v2 — precios desde Sanity | ⏳ PENDIENTE | `feat/order-assistant-v2` | — |

---

## Para sesiones sin contexto previo — leer esto primero

Este archivo es la única fuente de verdad para las dos features. Cuando empezás una sesión nueva sin historial, este archivo te da todo lo que necesitás para arrancar sin depender del historial conversacional.

**Proyecto:** Mas Cerca AP — sitio comercial de pulpas de fruta congelada (Colombia).  
**Stack:** Next.js 16.2.3, React 19, Tailwind 4, Sanity CMS, Supabase, Zod, Vitest, Resend (email).  
**Reglas del proyecto:**
- No ejecutar `build` después de cambios.
- No usar `cat/grep/find` — usar `bat/rg/fd`.
- TDD-first: escribir tests antes de implementar. Siempre RED → GREEN → REFACTOR.
- Strings de UI en `messages/es.json` + `messages/en.json` antes de crear el componente.
- Path alias `@/` apunta a la raíz del proyecto.
- Commits en conventional commits. Sin Co-Authored-By.

**Trazabilidad de tests:** `Otros/TRAZABILIDAD_TDD_TESTS.md`  
**Variables de entorno para email:** `RESEND_API_KEY`, `RESEND_TO_EMAIL`, `RESEND_FROM_EMAIL`

---

## Infraestructura existente relevante

### `/api/leads` — guarda en Supabase tabla `leads`
Campos disponibles: `nombre`, `email`, `tipo` (enum: `"pedido" | "negocio" | "consulta"`),
`producto_interes`, `preguntas_bot`, `fuente`, `whatsapp_number`, `consent_accepted`, `consented_at`.

**Para Feature B:** `tipo: "pedido"` y `fuente: "order_assistant"` identifican estos leads.

### `/api/contact` — envía email vía Resend
Patrón: valida con Zod → instancia `Resend(RESEND_API_KEY)` → `resend.emails.send({...})`.  
Rate limiting in-memory (mismo patrón que leads). HTML escapado contra XSS.  
**Para Feature B:** el nuevo `/api/orders` reutiliza exactamente este patrón.

### `lib/schemas/lead.ts` — schema Zod de leads
`leadSchema` ya tiene `tipo: z.enum(["pedido", "negocio", "consulta"])`.

---

## Separación de features

| | Feature A | Feature B |
|---|---|---|
| **Nombre** | Calculadora de Rendimiento | Asistente de Pedido Guiado |
| **Dependencia externa** | Ninguna — datos hardcodeados | Supabase (leads) + Resend (email) — ya configurados |
| **Bloqueante MVP** | Ninguno | Ninguno — infraestructura ya existe |
| **Bloqueante v2** | Ninguno | Cliente carga precios en Sanity Studio |
| **Branch** | `feat/yield-calculator` ✅ | `feat/order-assistant` |

---

## Orden de ejecución global

```
[Sesión 1] ✅ Feature A — motor de cálculo TDD + ChipSelector + YieldCalculator
[Sesión 2] 🔄 Feature A — integración home + mobile + PR → main
           ↓
     (cliente carga precios en Sanity Studio — paralelo, no bloquea MVP de B)
           ↓
[Sesión 3] Feature B MVP — flujo 8 pasos + API orders + HelpHub + CTA home + PR → main
[Sesión 4] Feature B v2 — precios live desde Sanity en chips y resultado + PR → main
```

---

## Feature A — Calculadora de Rendimiento

### ✅ Lo que ya está hecho (Sesión 1 — commit b15fe60)

| Archivo | Descripción |
|---|---|
| `lib/yield-calculator.ts` | Motor puro: `cupsPerPack`, `packsNeeded`, `freshComparison`, `buildWhatsappMessage` |
| `lib/yield-calculator.test.ts` | 14 tests unitarios — todos GREEN |
| `components/ui/ChipSelector.tsx` | Componente genérico reutilizable (Feature B lo usa sin modificar) |
| `components/sections/YieldCalculator.tsx` | Flujo 3 pasos: vasos → fruta → presentación → resultado con comparación fruta fresca |
| `vitest.config.ts` | Configurado con path alias `@/` y plugin React |
| `messages/es.json` + `messages/en.json` | Sección `yieldCalculator` completa |

### Ubicación en la home

```
HeroCarousel
ProductCategories
FeaturedProducts       ← el usuario ve los productos
[YieldCalculator]      ← AQUÍ — después de FeaturedProducts, antes de WhyChooseUs
WhyChooseUs            ← refuerza el argumento comercial de la calculadora
DailyOffer
TestimonialCarousel
[OrderAssistantCTA]    ← Feature B — card que abre HelpHub
CTA final
```

### Modelo de cálculo (MVP — vaso 12oz, intensidad estándar)

```ts
const GRAMS_PER_CUP = 55  // gramos de pulpa por vaso 12oz, intensidad estándar
cupsPerPack("120g")  → 2
cupsPerPack("300g")  → 5
cupsPerPack("1000g") → 18
```

---

### SESIÓN 2 — Integración home + mobile + PR 🔄 EN CURSO

**Branch:** `feat/yield-calculator` (continuar aquí)

#### Checklist Sesión 2

- [ ] Importar `YieldCalculator` en `app/[lang]/page.tsx`
- [ ] Insertar entre `<FeaturedProducts .../>` y `<WhyChooseUs .../>`
- [ ] Ejecutar `npm run test` → confirmar GREEN
- [ ] Revisar en mobile: touch targets, chips, scroll, resultado legible
- [ ] Crear PR: `feat/yield-calculator` → `main`
- [ ] Merge tras aprobación

---

## Feature B — Asistente de Pedido Guiado

### Objetivo comercial

Guiar al usuario a través de 8 pasos hasta generar un pedido estructurado.  
El pedido se envía a la empresa por **email y WhatsApp**.  
Los datos del usuario se guardan en Supabase para **marketing posterior**.

### Flujo de datos

```
Usuario completa 8 pasos
        ↓
[CLIENTE] OrderAssistantView.tsx (dentro del HelpDrawer)
        ↓
POST /api/orders
  ├── Supabase: INSERT leads (nombre, email/whatsapp, tipo:"pedido", fuente:"order_assistant")
  └── Resend: email con plantilla del pedido a la empresa
        ↓
[CLIENTE] Link WhatsApp prearmado → usuario lo envía manualmente
```

### Ubicación — HelpHub + CTA en home

**HelpHub:** nueva vista `"order"` dentro del drawer existente.  
**Home:** card/banner antes del CTA final que abre el drawer en la vista `"order"`.

**Cambios requeridos en HelpHub:**
1. Agregar `"order"` al tipo `View` en `HelpDrawer` / `HelpMenu`
2. Agregar item "Hacer un pedido" en `HelpMenu.tsx`
3. Crear `components/ui/drawer-views/OrderAssistantView.tsx`
4. Agregar función `openHelpHub("order")` al contexto `useHelpHub()`

> ⚠️ **Advertencia conocida:** el tipo `View` ya tuvo un bug en commit `81a9b34` cuando se agregó `whatsapp`. Al agregar `"order"` verificar que esté en TODOS los switches del drawer.

### Arquitectura de archivos

```
lib/schemas/order.ts                     ← Zod schema del pedido (user + order fields)
lib/schemas/order.test.ts                ← tests TDD-first del schema
lib/order-assistant.ts                   ← lógica de pasos + builders de mensaje
lib/order-assistant.test.ts              ← tests TDD-first

app/api/orders/route.ts                  ← POST: Supabase + Resend
app/api/orders/route.test.ts             ← tests TDD-first

components/ui/ChipSelector.tsx           ← reutilizar de Feature A ✅ ya existe
components/ui/drawer-views/
  OrderAssistantView.tsx                 ← componente cliente dentro del HelpDrawer
components/sections/
  OrderAssistantCTA.tsx                  ← card/banner en home que abre el HelpHub
```

### Schema Zod — `lib/schemas/order.ts`

```ts
export const orderSchema = z.object({
  nombre: z.string().min(2).max(80),
  email: z.string().email().max(254).optional().nullable(),
  whatsapp_number: z.string().regex(/^[+\d\s\-(). ]{7,20}$/).optional().nullable(),
  consentAccepted: z.literal(true),
  profile: z.enum(["hogar", "cafeteria", "evento", "distribucion"]),
  productType: z.string().min(1).max(60),
  fruit: z.string().min(1).max(60),
  presentation: z.enum(["120g", "300g", "1000g"]),
  quantity: z.number().int().min(1).max(9999),
  zone: z.enum(["bogota", "medellin", "cali", "otra"]),
  urgency: z.enum(["hoy", "manana", "semana", "sin_urgencia"]),
}).refine(
  (data) => data.email || data.whatsapp_number,
  { message: "Se requiere email o número de WhatsApp" }
)
```

### UX — flujo de 8 pasos dentro del HelpDrawer

```
Paso 1: ¿Para quién es el pedido?
  Chips: Hogar | Cafetería / Restaurante | Evento | Distribución

Paso 2: ¿Qué tipo de producto?
  Chips dinámicos por perfil:
    Hogar        → Pulpas | Zumos
    Cafetería    → Pulpas | Zumos | Lácteos
    Evento       → Pulpas | Zumos
    Distribución → Pulpas | Zumos | Lácteos

Paso 3: ¿Qué fruta o producto?
  Chips: Maracuyá | Mora | Mango | Lulo | Guanábana | Fresa | Piña | Tomate de árbol

Paso 4: ¿Qué presentación?
  MVP:  Chips: 120g | 300g | 1000g
  v2:   Chips con precio: 120g ($2.800) | 300g ($6.800) | 1000g ($19.500)

Paso 5: ¿Cuántas unidades necesitás?
  Chips: 5 | 10 | 20 | 50 | Personalizado

Paso 6: ¿Zona de entrega?
  Chips: Bogotá | Medellín | Cali | Otra ciudad

Paso 7: ¿Cuándo lo necesitás?
  Chips: Hoy | Mañana | Esta semana | Sin urgencia

Paso 8: Tus datos de contacto
  Input: Nombre completo (requerido)
  Input: Email (opcional si hay WhatsApp)
  Input: Número de WhatsApp (opcional si hay email)
  Checkbox: Acepto que mis datos sean usados para contactarme (requerido)

─── Resultado ──────────────────────────────────────────────────
  [Enviar por WhatsApp]     ← link prearmado, usuario envía manualmente
  [Enviar pedido por email]  ← POST /api/orders → Resend + Supabase
```

### Email template (HTML) enviado a la empresa

```
Asunto: 🛒 Nuevo pedido — {nombre} — {fruit} {presentation}

DATOS DEL CLIENTE
Nombre: {nombre} | Email: {email} | WhatsApp: {whatsapp_number} | Zona: {zone}

DETALLE DEL PEDIDO
Perfil: {profile} | Tipo: {productType} | Fruta: {fruit}
Presentación: {presentation} | Cantidad: {quantity} | Urgencia: {urgency}
```

---

### SESIÓN 3 — Feature B MVP (sin precios) ⏳ PENDIENTE

**Branch:** crear desde `main` → `feat/order-assistant`  
**Prerequisito:** Feature A mergeada a `main`

#### Checklist Sesión 3

**Schema y lógica pura (TDD-first):**
- [ ] Agregar strings `orderAssistant` en `messages/es.json` + `messages/en.json`
- [ ] Crear `lib/schemas/order.ts` con schema + refine email-o-whatsapp
- [ ] TDD-first: `lib/schemas/order.test.ts` (payload válido/inválido, refine, consent)
- [ ] Crear `lib/order-assistant.ts` — `getProductOptionsForProfile`, `buildWhatsappMessage`, `buildOrderEmailHtml`
- [ ] TDD-first: `lib/order-assistant.test.ts` (opciones por perfil, mensaje WhatsApp, HTML email)

**API route (TDD-first):**
- [ ] Crear `app/api/orders/route.ts` — rate limit + orderSchema + Supabase + Resend
- [ ] TDD-first: `app/api/orders/route.test.ts` (400 inválido, 503 sin key, 200 ok, 429 rate limit)

**Componentes:**
- [ ] Crear `components/ui/drawer-views/OrderAssistantView.tsx` (8 pasos, submit a API)
- [ ] Agregar vista `"order"` al tipo `View` en HelpDrawer / HelpMenu
- [ ] Agregar item "Hacer un pedido" en `HelpMenu.tsx`
- [ ] Crear `components/sections/OrderAssistantCTA.tsx` (card home → abre HelpHub)
- [ ] Integrar `OrderAssistantCTA` en home antes del CTA final
- [ ] Ejecutar `npm run test` → GREEN
- [ ] Crear PR: `feat/order-assistant` → `main`

---

### SESIÓN 4 — Feature B v2 (con precios desde Sanity) ⏳ PENDIENTE

**Branch:** `feat/order-assistant-v2`  
**Prerequisito:** cliente cargó precios en Sanity Studio

#### Tarea del cliente antes de Sesión 4

Agregar campo `precios` al schema del producto en Sanity:
```ts
{ name: 'precios', title: 'Precios (COP)', type: 'object', fields: [
  { name: 'precio120g', title: 'Precio 120g', type: 'number' },
  { name: 'precio300g', title: 'Precio 300g', type: 'number' },
  { name: 'precio1000g', title: 'Precio 1000g', type: 'number' },
]}
```

#### Checklist Sesión 4

- [ ] TDD-first: tests para `calculateEstimatedPrice` (descuentos 0%/5%/10%/15%)
- [ ] Implementar `calculateEstimatedPrice` en `lib/order-assistant.ts`
- [ ] Server component / fetch para leer precios desde Sanity
- [ ] Actualizar `OrderAssistantView.tsx`: chips con precio, resultado con descuento
- [ ] Ejecutar `npm run test` → GREEN
- [ ] Crear PR: `feat/order-assistant-v2` → `main`

---

## Tabla de Precios — Pulpas (valores COP)

> **Estado:** Valores provisorios (placeholder). Requieren validación del negocio antes de mostrar.

| Fruta | 120g | 300g | 1000g |
|---|---|---|---|
| Maracuyá | $2.800 | $6.800 | $19.500 |
| Mora | $3.200 | $7.400 | $21.000 |
| Mango | $2.600 | $6.200 | $17.500 |
| Lulo | $3.000 | $7.000 | $20.000 |
| Guanábana | $3.800 | $8.800 | $24.500 |
| Fresa | $2.900 | $6.600 | $18.500 |
| Piña | $2.400 | $5.600 | $16.000 |
| Tomate de árbol | $2.800 | $6.500 | $18.000 |
| Borojo | $4.000 | $9.200 | $26.500 |
| Corozo | $3.400 | $7.800 | $22.000 |

### Descuentos por volumen (Feature B v2)

| Cantidad | Descuento |
|---|---|
| 1 - 9 unidades | 0% |
| 10 - 19 unidades | 5% |
| 20 - 49 unidades | 10% |
| 50+ unidades | 15% |

---

## Notas técnicas

- **Test runner:** `npm run test` (Vitest, configurado en `vitest.config.ts`)
- **No ejecutar build** — regla del proyecto
- **Email en dev:** si `RESEND_API_KEY` no está, el endpoint responde `{ success: true, dev: true }`
- **Supabase:** tabla `leads` ya existe — sin migración para MVP. Campo `fuente` diferencia los leads.
- **ChipSelector:** componente genérico `components/ui/ChipSelector.tsx` — NO modificar al implementar Feature B
- **Tipo `View` en HelpMenu:** al agregar `"order"` verificar todos los switches y el tipo unión
- **Rate limiting:** mismo patrón in-memory que `/api/leads` y `/api/contact`
- **WhatsApp CTA:** `https://wa.me/{numero}?text={encodeURIComponent(mensaje)}`
- **Feature A:** no requiere Sanity, Supabase ni Resend
- **Feature B MVP:** requiere Supabase + Resend (ya configurados). No requiere Sanity.
- **Feature B v2:** requiere Sanity para leer precios en runtime
