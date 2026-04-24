# Changelog — Mas Cerca AP

## [Sesión 2026-04-23]

### 🐛 Correcciones de bugs
- **Client boundary** (`FeaturedProducts`, `WhyChooseUs`, `DailyOffer`): agregado `"use client"` — Framer Motion requiere browser APIs; sin la directiva rompía el render en App Router con error `createMotionComponent() from the server`
- **i18n ProductCard**: nombre y descripción de productos se mostraban en español en la versión inglés — ahora usan `dict.productLines[line].label` y `dict.productLines[line].description` según el idioma activo
- **i18n page.tsx**: strings `"Clientes"` y `"Entregas en Bogotá"` estaban hardcodeados en español — movidos al diccionario `es.json` / `en.json`
- **gitignore**: la entrada `Otros/` estaba comentada (`#Otros`) — activada para excluir correctamente la carpeta de archivos de trabajo

### ✨ Nuevas funcionalidades
- **Producto Kumis Yolito**: imagen optimizada JPEG→WebP (17KB→5.5KB, 67% reducción), asset subido a Sanity CDN, documento de producto creado en línea `kumiss`
- **Redes sociales**: Instagram `@mas_cerca_ap` integrado; Facebook y TikTok con íconos visibles pendientes de URL; links sociales movidos a `SITE_CONFIG` como fuente de verdad
- **Testimonios bilingües**: schema de Sanity actualizado con campos opcionales `text_en` / `role_en`; query y `TestimonialCarousel` usan el idioma activo; 3 testimonios creados en Sanity con versiones en inglés
- **Hover en sellos DailyOffer**: `whileHover={{ scale: 1.08, rotate: 3 }}` — los sellos reaccionan al mouse con spring animation

### 🔧 Datos Sanity actualizados
- **Testimonios**: creados 3 documentos (María Elena González, Carlos Andrés Mendoza, Andrea Lucía Pérez) con textos en español e inglés
- **Productos destacados**: rebalanceados — uno por categoría: Zumo de Limón (jugos) · Pulpa de Maracuyá (pulpas) · Kumis Yolito (lácteos). Antes mostraba 3 variantes de Zumo de Limón

### ⚡ Rendimiento y calidad
- **HeroCarousel**: eliminado `loading="eager"` hardcodeado en todas las imágenes — ahora solo `priority={currentSlide === 0 && currentFrame === 0}` controla el LCP; el resto carga lazy
- **HeroCarousel**: `h-[500px] md:h-[600px]` → `min-h-[500px] md:min-h-[600px]` — evita clip de contenido en viewports pequeños (iPhone SE)
- **ScrollProgress**: `z-[9999]` → `z-50` — valor arbitrario reemplazado por uno predecible dentro del sistema de z-index del proyecto

### 📞 Contacto
- Teléfono actualizado a `+57 321 905 4984` en `SITE_CONFIG` (afecta footer, páginas legales y JSON-LD)

---

## Pendientes del cliente
- Email corporativo para reemplazar `apalejandraplata@gmail.com` en `SITE_CONFIG.emailContact`
- URLs de Facebook y TikTok para activar los íconos en el footer (`SITE_CONFIG.socialFacebook`, `SITE_CONFIG.socialTikTok`)
- Número de WhatsApp confirmado para el botón "Pedir ahora" (`NEXT_PUBLIC_WHATSAPP_NUMBER` en `.env.local`)
