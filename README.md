# Mas Cerca AP — Sitio Web

Sitio web profesional para **Mas Cerca AP**, empresa colombiana de jugos y pulpas de fruta 100% naturales.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript (strict) |
| Estilos | Tailwind CSS v4 |
| Animaciones | Framer Motion 12 (LazyMotion) |
| Formularios | React Hook Form + Zod |
| Base de datos | Supabase (PostgreSQL) |
| Emails | Resend |
| Deploy | Vercel / Hostinger Node.js |
| Tests | Vitest |

> **Importante:** Este proyecto usa Next.js 16, que tiene breaking changes respecto a versiones anteriores. El archivo de interceptor se llama `proxy.ts` (no `middleware.ts`). Leer `node_modules/next/dist/docs/` antes de modificar convenciones del framework.

## Identidad visual

| Elemento | Valor |
|----------|-------|
| Primario (verde) | `#4CAF50` |
| Acento (naranja) | `#FF9800` |
| Fondo | `#FFFFFF` |
| Tipografía | Poppins (Google Fonts) |

## Arquitectura de datos

```
Supabase (PostgreSQL)               data/*.ts (fallback estático)
├── products                        ├── products.ts  (~47 productos)
├── testimonials                    └── testimonials.ts
└── leads  (pedidos y contacto)
```

- **Supabase** es la fuente de verdad en producción.
- Si Supabase no está disponible (env vars ausentes o error de red), `getAllProducts()` y `getAllTestimonials()` retornan los arrays estáticos de `data/*.ts`.
- Los leads (pedidos y capturas del chatbot) se insertan exclusivamente en Supabase — no tienen fallback estático.

## Gestión de contenido

Productos y testimonios se administran desde el panel interno. No hay CMS externo.

- **URL:** `/admin/login`
- **Auth:** JWT en cookie `admin_session` (httpOnly, secure, 7 días)
- **Credencial:** email configurado en la variable `ADMIN_EMAIL`

### Gestión de productos

El panel en `/admin/productos` permite:

- **Listar** todos los productos (activos e inactivos), con columna de precio visible directamente en la tabla
- **Crear** un producto nuevo (`/admin/productos/nuevo`)
- **Editar** todos los campos de un producto (`/admin/productos/[id]`)
- **Toggles rápidos** desde la lista (sin abrir el formulario):
  - `Destacado` — aparece en el home (máximo 3 simultáneos, validado server-side)
  - `Más Vendido` — badge visible en la card del catálogo
  - `Agotado` — muestra badge y deshabilita el botón de pedido
  - `Activo / Inactivo` — soft delete: inactivo no aparece en el catálogo público
- **Eliminar** es un soft delete (`active = false`) — no borra el registro de Supabase

Los cambios se reflejan en el sitio en la próxima carga (revalidación cada 3600 segundos).

### Gestión de precios

**Fuente única de verdad: el campo `price` en Supabase (tabla `products`).**

| Lugar | Propósito | Cómo actualizar |
|-------|-----------|-----------------|
| Campo `price` en Supabase | Precio visible en el catálogo y usado en los emails de pedido | Editar desde `/admin/productos/[id]` o correr `scripts/update-prices.ts` |
| `PRICES_COP` en `lib/order-assistant.ts` | Estimados visuales en el formulario de pedido del cliente | Se actualiza con deploy — solo si los precios cambian radicalmente |

**Cómo funciona en producción:**

- Cuando el cliente confirma un pedido, `/api/orders` fetchea todos los precios desde Supabase en tiempo real y los usa para calcular los totales del email.
- Si Supabase no está disponible, el email cae al fallback estático `PRICES_COP` (los precios siguen siendo correctos porque `PRICES_COP` se mantiene sincronizado con Supabase).
- El formulario del cliente muestra estimados usando `PRICES_COP` (marcados como "precio estimado — el equipo confirma el valor final").

**Lista de precios del catálogo activo** (fuente: documentos del cliente):
- `Otros/Lista-Precios.md` — Pulpas (120g, 300g, 1000g)
- `Otros/Imagenes/ListaPreciosZumos.jpeg` — Zumos y Lácteos

Para actualizar todos los precios en Supabase de una sola vez:

```bash
set -a && source .env.local && set +a
npx tsx scripts/update-prices.ts
```

### Gestión de imágenes

| Fuente | Dónde vive | Cuándo se usa |
|--------|-----------|---------------|
| `/public/imgs/` | Build del proyecto (git) | Imágenes originales del catálogo inicial |
| Supabase Storage (bucket `product-images`) | CDN de Supabase | Imágenes subidas desde el panel admin |

**Flujo de subida:**

```
Admin selecciona imagen en el formulario de producto
        ↓
POST /api/admin/upload  (valida tipo: webp/jpg/png, máx 2MB)
        ↓
Se sube al bucket "product-images" en Supabase Storage
        ↓
Se retorna la URL pública del CDN de Supabase
        ↓
Esa URL queda guardada en el campo `image` del producto en Supabase
        ↓
El catálogo público muestra la imagen directamente desde el CDN
```

> El bucket `product-images` debe tener **acceso público** habilitado en Supabase → Storage → Policies. Sin esto, las imágenes no son visibles en el sitio.

## Estructura del proyecto

```
mas-cerca-ap/
├── app/
│   ├── [lang]/               # Rutas i18n dinámicas (es / en)
│   │   ├── page.tsx          # Home
│   │   ├── productos/        # Catálogo con filtros
│   │   ├── nosotros/         # Acerca de la empresa
│   │   ├── contacto/         # Formulario de contacto
│   │   ├── politicas/        # Políticas de privacidad
│   │   └── terminos/         # Términos y condiciones
│   ├── admin/                # Panel de administración (protegido)
│   │   ├── login/
│   │   └── productos/        # Lista, creación y edición de productos
│   ├── api/
│   │   ├── contact/          # POST — formulario de contacto (email via Resend)
│   │   ├── leads/            # POST — capturas del chatbot (Supabase)
│   │   ├── orders/           # POST — pedidos (email via Resend + lead en Supabase)
│   │   └── admin/
│   │       ├── auth/         # Login / logout (JWT cookie)
│   │       ├── products/     # CRUD de productos
│   │       └── upload/       # Subida de imágenes a Supabase Storage
│   ├── layout.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── layout/               # Navbar, Footer
│   ├── ui/                   # Componentes reutilizables
│   └── sections/             # Secciones de página (Hero, FeaturedProducts, etc.)
├── lib/
│   ├── config.ts             # SITE_CONFIG — fuente de verdad para datos de contacto
│   ├── supabase.ts           # Cliente Supabase
│   ├── supabase/queries.ts   # Queries a la BD (products, testimonials)
│   ├── admin-auth.ts         # Validación de JWT cookie
│   ├── order-assistant.ts    # Builder de HTML para emails de pedido
│   ├── yield-calculator.ts   # Calculadora de rendimiento de pulpas
│   ├── faq-matcher.ts        # Matching de preguntas del chatbot FAQ
│   ├── i18n/                 # getDictionary, DictionaryProvider, MotionProvider
│   └── schemas/              # Schemas Zod para validación de APIs y formularios
├── data/                     # Fallback estático (cuando Supabase no disponible)
│   ├── products.ts
│   └── testimonials.ts
├── messages/                 # Diccionarios i18n
│   ├── es.json
│   └── en.json
├── supabase/
│   └── migrations/           # Schema SQL + RLS policies
├── types/index.ts            # Tipos TypeScript compartidos del proyecto
├── public/
│   └── imgs/                 # Imágenes del catálogo original (incluidas en el build)
├── scripts/
│   └── migrate-to-supabase.ts  # Migración inicial de data/*.ts a Supabase
└── proxy.ts                  # Interceptor Next.js 16 — i18n y auth de /admin
```

## Instalación

```bash
cd mas-cerca-ap
npm install
cp .env.local.example .env.local
# Completar las variables en .env.local
npm run dev
```

Sitio público: http://localhost:3000  
Panel admin: http://localhost:3000/admin/login

## Variables de entorno

```env
# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=57XXXXXXXXXX

# Supabase (base de datos)
# NEXT_PUBLIC_SUPABASE_URL se usa tanto en el sitio público como en el panel admin
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend (emails transaccionales)
RESEND_API_KEY=re_...
RESEND_TO_EMAIL=destino@ejemplo.com
RESEND_FROM_EMAIL=noreply@tudominio.com

# Panel de administración
ADMIN_EMAIL=admin@ejemplo.com
```

> Sin `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, el sitio carga pero usa los datos estáticos de `data/` como fallback.

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # ESLint
npm run test         # Tests con Vitest (modo run)
npm run test:watch   # Tests en modo watch
npm run images:update-local  # Descarga imágenes de productos al directorio local
```

## Deploy en Vercel

1. Subir el proyecto a GitHub
2. Conectar con Vercel (vercel.com/new) e importar el repositorio
3. Configurar todas las variables de entorno en el dashboard de Vercel
4. Deploy automático en cada push a `main`

> Las imágenes subidas desde el panel admin van a **Supabase Storage** (no al filesystem del servidor), por lo que son compatibles con Vercel sin configuración adicional.

## Funcionalidades

- Catálogo completo con filtros por línea de producto
- i18n español/inglés con enrutamiento dinámico (`/es/`, `/en/`)
- Chatbot FAQ con captura de leads en Supabase
- Formulario de contacto y pedidos con emails via Resend
- Calculadora de rendimiento para pulpas de fruta
- Panel de administración para gestionar productos (CRUD + imágenes)
- Botón flotante de WhatsApp con animación
- SEO: metadata, Open Graph, sitemap.xml, robots.txt
- Rate limiting por IP en todas las API routes

## Licencia

© 2026 Mas Cerca AP. Todos los derechos reservados.
