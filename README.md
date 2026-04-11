# Mas Cerca Ap - Sitio Web

Sitio web profesional para **Mas Cerca Ap**, empresa bogotana de jugos y cítricos 100% naturales.

## 🚀 Tecnologías

- **Framework**: Next.js 14 (App Router)
- **Estilos**: Tailwind CSS
- **Animaciones**: Framer Motion
- **Formularios**: React Hook Form + Zod
- **Lenguaje**: TypeScript
- **Deploy**: Vercel

## 🎨 Identidad Visual

| Elemento | Color |
|----------|-------|
| Primario (Verde) | `#4CAF50` |
| Acento (Naranja) | `#FF9800` |
| Fondo | `#FFFFFF` |

**Tipografía**: Poppins (Google Fonts)

## 📁 Estructura del Proyecto

```
mas-cerca-ap/
├── app/
│   ├── page.tsx           # Home
│   ├── productos/page.tsx # Catálogo
│   ├── nosotros/page.tsx  # Nosotros
│   ├── contacto/page.tsx   # Contacto
│   ├── api/contact/       # API de formulario
│   └── sitemap.ts         # SEO
├── components/
│   ├── layout/            # Navbar, Footer, WhatsAppButton
│   ├── ui/                # ProductCard, HeroCarousel, etc.
│   └── sections/          # FeaturedProducts, WhyChooseUs, etc.
├── data/                  # Products, testimonials, salesPoints
├── types/                 # TypeScript types
└── public/               # robots.txt
```

## 🛠️ Instalación

```bash
# Clonar el proyecto
cd mas-cerca-ap

# Instalar dependencias
npm install

# Copiar archivo de variables de entorno
cp .env.local.example .env.local

# Iniciar servidor de desarrollo
npm run dev
```

El sitio estará disponible en: http://localhost:3000

## 📝 Variables de Entorno

Crear archivo `.env.local` basado en `.env.local.example`:

```env
NEXT_PUBLIC_WHATSAPP_NUMBER=573001234567
NEXT_PUBLIC_GOOGLE_MAPS_KEY=YOUR_KEY
RESEND_API_KEY=re_XXXXXXXXXX
```

## 🚀 Deploy en Vercel

1. Subir el proyecto a GitHub
2. Conectar con Vercel (vercel.com/new)
3. Importar repositorio
4. Vercel detectará automáticamente Next.js

### Dominio Personalizado

En Vercel Dashboard → Settings → Domains:
1. Agregar tu dominio (ej: mascercap.com)
2. Actualizar DNS según instrucciones de Vercel

## ✅ Funcionalidades Implementadas

### Fase 1 (MVP) - Completado ✅

- [x] 4 páginas completas (Home, Productos, Nosotros, Contacto)
- [x] Hero carrusel con 3 slides y animaciones
- [x] Cards 3D flip para productos (Framer Motion)
- [x] Filtros de catálogo (sabor, tamaño, precio)
- [x] Formulario de contacto con validación Zod
- [x] Botón flotante WhatsApp con animación pulse
- [x] Navbar sticky con hide/show en scroll
- [x] SEO: metadata, Open Graph, sitemap, robots.txt
- [x] API route para formulario de contacto
- [x] 12 productos mock (6 limón, 6 naranja)
- [x] 3 testimonios de clientes
- [x] 3 puntos de venta en Bogotá

### Fase 2 (Pendiente)

- [ ] Integración Sanity CMS
- [ ] Google Analytics 4
- [ ] Lightbox con galería de productos
- [ ] Sistema de reseñas con fotos

## 📱 Responsive Design

- **Mobile**: 1 columna
- **Tablet**: 2 columnas  
- **Desktop**: 3 columnas

## 🔧 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Iniciar servidor de producción
npm run lint     # Linting ESLint
```

## 📄 Licencia

© 2026 Mas Cerca Ap. Todos los derechos reservados.