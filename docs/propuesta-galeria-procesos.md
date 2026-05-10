# Propuesta: Galería de Procesos por Línea de Producto

**Sección:** Nosotros → "Nuestro Proceso en Imágenes"  
**Estado actual:** 6 flip cards del proceso de Jugos Naturales  
**Propuesta:** Expandir a 3 líneas de proceso con navegación por tabs

---

## La idea en una frase

Mostrar que cada línea de producto tiene su propia historia de origen, proceso y compromiso — no solo los jugos, sino también las pulpas y los lácteos.

---

## Por qué 3 procesos y no 6

Las líneas de limón, limonada cereza, limonada coco y maracuyá comparten el **mismo proceso productivo** — solo cambia la fruta. Mostrar 4 versiones del mismo proceso sería repetitivo para el cliente.

Las 3 líneas propuestas tienen procesos genuinamente distintos:

| Línea | Lo que la hace única visualmente |
|---|---|
| **Jugos Naturales** | Exprimido en frío, proceso húmedo, trabajo con cítricos |
| **Pulpas de Frutas** | Congelación en punto de madurez, cadena de frío, variedad de colores |
| **Lácteos** | Fermentación artesanal, tradición lechera, proceso completamente diferente |

---

## Cómo se vería en pantalla

### Selector de proceso (tabs)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ● Jugos Naturales   ○ Pulpas   ○ Lácteos         │
│   ─────────────                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Tres pestañas horizontales centradas
- La pestaña activa tiene un subrayado animado con el color de la línea
- Al cambiar de pestaña, las 6 cards actuales salen hacia la izquierda y las nuevas entran desde la derecha (animación suave)

### La grilla de cards (igual a la actual)

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │
│  Card 1  │  │  Card 2  │  │  Card 3  │
│          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │
│  Card 4  │  │  Card 5  │  │  Card 6  │
│          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘
```

- Cada card: imagen al frente con título visible, descripción al dorso
- Flip automático (peek) cuando entra al viewport
- Click/tap para voltear manualmente

---

## Las 18 imágenes del proyecto

### ✅ Proceso 1 — Jugos Naturales (6 imágenes listas)

| # | Imagen | Descripción |
|---|---|---|
| 1 | `Naranja-Seleccion.png` | Campesino recogiendo naranjas al amanecer |
| 2 | `Naranja-Compra.png` | Compra directa en finca — camión con costales |
| 3 | `Naranja-Frio.png` | Exprimido artesanal en frío |
| 4 | `Naranja-Tiene-Juez.png` | Control de calidad — mujer inspeccionando la fruta |
| 5 | `Naranja-Frescuras.png` | Botella recién llenada con condensación |
| 6 | `Naranja-Detras-Cada-Botella.png` | La pareja fundadora trabajando |

---

### 🔲 Proceso 2 — Pulpas de Frutas (6 imágenes por generar)

El arco narrativo de las pulpas cuenta una historia distinta: la fruta se congela en su punto exacto de madurez para que llegue perfecta sin importar la temporada.

| # | Título de la card | Escena propuesta |
|---|---|---|
| 1 | **La fruta en su momento exacto** | Manos recogiendo mora o fresa madura en un cultivo de tierra fría colombiana — gotitas de rocío en la fruta, luz de mañana |
| 2 | **Colores del campo colombiano** | Una mesa con frutas enteras de distintas pulpas: maracuyá, mora, fresa, mango, guanábana — colores vibrantes, luz natural |
| 3 | **El frío que conserva** | Frutas siendo sumergidas o procesadas en una tina con agua fría antes de la congelación — vapor visible, colores intensos |
| 4 | **Cero desperdicio** | Manos con guantes separando cuidadosamente pulpa de semilla, fruta abierta, trabajo minucioso y artesanal |
| 5 | **Sellada en su punto** | Bolsas transparentes de pulpa siendo selladas al vacío — se ven los colores de la fruta a través del plástico, escarcha en los bordes |
| 6 | **Lista para cuando la necesités** | Manos sacando una bolsa de pulpa congelada de una nevera — vapor de frío visible, colores vibrantes de la fruta contra el blanco del hielo |

---

### 🔲 Proceso 3 — Lácteos / Kumiss (6 imágenes por generar)

El Kumiss tiene la historia más profunda: es tradición colombiana, fermentación artesanal, campo y sabor en cada sorbo.

| # | Título de la card | Escena propuesta |
|---|---|---|
| 1 | **La leche que lo empieza todo** | Un campesino ordeñando a mano en una finca colombiana de madrugada — vapor de leche tibia, luz de farol, barro en las botas |
| 2 | **Directo del campo** | Un balde de leche recién ordeñada siendo vertido en un recipiente limpio — la leche cae densa y blanca, finca de fondo |
| 3 | **El arte de fermentar** | Grandes recipientes de acero inoxidable tapados, con termómetro visible — ambiente limpio y controlado, temperatura precisa |
| 4 | **El tiempo hace el trabajo** | Primer plano del interior de un recipiente de fermentación — la leche transformándose, textura visible, proceso natural |
| 5 | **Artesanal hasta la última gota** | Manos llenando botellas de Kumiss con un embudo artesanal — el líquido blanco cayendo, botella con el label "Más Cerca AP" |
| 6 | **Tradición que se entrega** | La botella de Kumiss terminada en una hacienda colombiana — el mismo escenario de la foto de producto, contexto completo |

---

## Implementación técnica

### Lo que ya existe y se reutiliza
- Componente `FlipCard` con peek automático ✅
- Lógica de flip con `useState` ✅
- Animaciones de entrada con Framer Motion ✅
- Mensaje de instrucción en mobile ✅

### Lo que se agrega
- **Componente de tabs** con indicador animado por color de línea
- **`AnimatePresence`** de Framer Motion para la transición entre sets de cards
- **Estructura de datos** con los 3 procesos en un array anidado

### Estructura de datos propuesta

```typescript
const processes = [
  {
    key: "jugos",
    label: "Jugos Naturales",
    color: "from-lime-500 to-green-600",
    cards: [ /* 6 flip cards */ ],
  },
  {
    key: "pulpas",
    label: "Pulpas de Frutas",
    color: "from-purple-500 to-violet-600",
    cards: [ /* 6 flip cards */ ],
  },
  {
    key: "lacteos",
    label: "Lácteos",
    color: "from-amber-400 to-yellow-500",
    cards: [ /* 6 flip cards */ ],
  },
];
```

### Flujo de interacción

```
Usuario ve la sección
       ↓
Cards de "Jugos Naturales" hacen peek automático
       ↓
Usuario hace click en tab "Pulpas de Frutas"
       ↓
Cards actuales salen → cards nuevas entran (AnimatePresence)
       ↓
Peek automático en las nuevas cards
       ↓
Usuario puede flipear cada card para leer el proceso
```

---

## Lo que se necesita para implementar

### Imágenes (prioridad alta)
- 12 imágenes nuevas generadas con Midjourney (6 pulpas + 6 lácteos)
- Mismo estilo: `--ar 3:2 --v 6.1 --style raw --q 2`
- Formato PNG → convertir a WebP cuando estén todas listas

### Desarrollo (una vez aprobadas las imágenes)
- Refactorizar la sección de galería en `NosotrosPageContent.tsx`
- Agregar el selector de tabs con animación
- Integrar `AnimatePresence` para transición entre procesos
- Ajuste de textos del dorso para pulpas y lácteos

### Tiempo estimado de generación de imágenes
- 12 prompts ya listos para generar
- Cada imagen puede requerir 1-3 intentos para quedar bien
- Total: entre 12 y 36 generaciones en Midjourney

---

## Resultado esperado

Una sección de Nosotros que demuestra que **Más Cerca AP no es una empresa de jugos — es una empresa de procesos honestos** aplicados a tres líneas de producto distintas. El cliente que llega a esta página entiende que detrás de cada botella o bolsa hay una historia específica, un campo específico, unas manos específicas.

---

*Documento preparado para revisión con el cliente — pendiente aprobación para implementación.*
