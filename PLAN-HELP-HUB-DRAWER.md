# Plan: Help Hub Drawer — Mas Cerca AP

## Rama de trabajo
`feat/help-hub-drawer`

## Contexto y origen de la idea

El cliente quería consolidar dos elementos flotantes existentes (`WhatsAppButton.tsx` y `ChatBot.tsx`) en un único punto de entrada. La inspiración visual es un botón "¿Necesita ayuda?" con ícono de audífonos que al presionarse despliega un submenú con opciones.

Se decidió escalar la idea a un **drawer lateral de pantalla completa** para:
- Mejorar la legibilidad de documentos legales sin salir del sitio
- Dar espacio suficiente al FAQ conversacional
- Agrupar toda la ayuda y contacto en un solo hub

---

## Objetivo

Reemplazar el `WhatsAppButton.tsx` flotante y el `ChatBot.tsx` existente por un único **Help Hub Drawer** que el usuario activa desde un botón flotante. El drawer permite navegar entre FAQ, documentos legales y opciones de contacto sin abandonar la página.

---

## Arquitectura visual

### Botón flotante (trigger)
- Posición: `fixed bottom-6 right-6`
- Forma: pill redondeada (como la imagen de referencia)
- Contenido: ícono de audífonos + texto "¿Necesita ayuda?"
- Colores: fondo oscuro (navy/primary), texto blanco
- Al hacer click: abre el drawer deslizando desde la derecha

### Drawer
- **Ancho**: `45vw` en desktop / `90vw` en mobile
- **Alto**: `100vh` (pantalla completa)
- **Posición**: fixed, pegado al borde derecho
- **Animación**: slide-in desde la derecha con Framer Motion
- **Overlay**: fondo semitransparente oscuro detrás del drawer
- **Header**: logo pequeño + título de la vista actual + botón cerrar (X)
- **Navegación**: botón "← Volver" cuando se está en una vista secundaria

---

## Vistas del drawer

### Vista 1 — Menú principal
Lista de opciones con ícono, label y flecha:

```
🎧  ¿Necesita ayuda?          ← header del drawer

[🔍 Barra de búsqueda - solo activa en FAQ]

📂  Preguntas frecuentes    →
📄  Políticas y privacidad  →
📋  Términos y condiciones  →
📬  Formulario de contacto  →
💚  Contactar por WhatsApp  (link directo, abre en nueva pestaña)
```

### Vista 2 — Preguntas frecuentes
- Barra de búsqueda por keywords (usa `lib/faq-matcher.ts` ya existente)
- Navegación por categorías como acordeón o chips:
  - 🍊 Productos
  - 📦 Pedidos y entregas
  - 🏪 Distribución / Mayoreo
  - 🏢 Empresa
  - ✅ Proceso y calidad
- Al seleccionar categoría → muestra preguntas de esa categoría
- Al seleccionar pregunta → muestra respuesta
- Botón "← Volver a categorías" en cada nivel

**Sin resultado en búsqueda:**
```
😕 No encontramos esa respuesta

¿Cómo querés contactarnos?
[💚 Escribinos por WhatsApp]
[📬 Usar formulario de contacto]
```

### Vista 3 — Políticas y privacidad
- Título + contenido scrolleable dentro del drawer
- Texto completo de la política de privacidad
- Botón "← Volver al menú"

### Vista 4 — Términos y condiciones
- Mismo patrón que Vista 3
- Texto completo de los términos y condiciones
- Botón "← Volver al menú"

### Vista 5 — Formulario de contacto
- Reutiliza el componente `ContactForm.tsx` ya existente y funcional
- Se renderiza dentro del drawer (sin navegación a otra página)
- Botón "← Volver al menú"

---

## WhatsApp

- Variable de entorno: `NEXT_PUBLIC_WHATSAPP_NUMBER`
- **Estado actual**: número pendiente — el cliente (dueño del sitio) no lo ha proporcionado aún
- **Implementación**: usar placeholder `573000000000` hasta recibir el número real
- **Link generado**: `https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hola,%20necesito%20ayuda`
- **Apertura**: `target="_blank"` — única opción que saca al usuario del sitio (inevitable)

---

## Archivos a crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `components/ui/HelpHub.tsx` | Crear | Botón flotante trigger + lógica de apertura/cierre del drawer |
| `components/ui/HelpDrawer.tsx` | Crear | Drawer principal con navegación entre vistas |
| `components/ui/drawer-views/HelpMenu.tsx` | Crear | Vista 1: menú principal con las 5 opciones |
| `components/ui/drawer-views/FaqView.tsx` | Crear | Vista 2: FAQ con búsqueda y acordeón de categorías |
| `components/ui/drawer-views/LegalView.tsx` | Crear | Vista 3 y 4: doc legal scrolleable (recibe el contenido como prop) |
| `components/ui/drawer-views/ContactView.tsx` | Crear | Vista 5: wrapper del ContactForm existente |
| `data/legal.ts` | Crear | Contenido de Políticas y Términos como strings estructurados |
| `app/[lang]/politicas/page.tsx` | Crear | Página pública /politicas (requerimiento legal — crawleable) |
| `app/[lang]/terminos/page.tsx` | Crear | Página pública /terminos (requerimiento legal — crawleable) |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/[lang]/layout.tsx` | Reemplazar `<WhatsAppButton />` y `<ChatBot />` por `<HelpHub />` |
| `components/layout/Footer.tsx` | Agregar links a /politicas y /terminos (requerimiento legal) |
| `messages/es.json` | Agregar keys para helpHub.* |
| `messages/en.json` | Agregar keys para helpHub.* |
| `.env.local` | Agregar `NEXT_PUBLIC_WHATSAPP_NUMBER=573000000000` (placeholder) |

## Archivos a eliminar (funcionalidad migrada al Hub)

| Archivo | Razón |
|---------|-------|
| `components/ui/WhatsAppButton.tsx` | Reemplazado por opción dentro del drawer |
| `components/ui/ChatBot.tsx` | Reemplazado por FaqView dentro del drawer |
| `components/ui/ChatBotPanel.tsx` | Reemplazado por FaqView dentro del drawer |

> ⚠️ IMPORTANTE: Antes de eliminar, verificar que `HelpHub` esté funcionando correctamente en staging.

---

## i18n — Keys a agregar

```json
{
  "helpHub": {
    "trigger": "¿Necesita ayuda?",
    "title": "Centro de ayuda",
    "close": "Cerrar",
    "back": "Volver",
    "search": "Buscar...",
    "noResults": "No encontramos esa respuesta",
    "contactOptions": "¿Cómo querés contactarnos?",
    "menu": {
      "faq": "Preguntas frecuentes",
      "privacy": "Políticas y privacidad",
      "terms": "Términos y condiciones",
      "contact": "Formulario de contacto",
      "whatsapp": "Contactar por WhatsApp"
    }
  }
}
```

---

## Diseño visual del drawer

- **Header**: fondo `primary` (navy oscuro), texto blanco, logo pequeño
- **Cuerpo**: fondo blanco, texto `gray-800`
- **Items del menú**: padding generoso, borde inferior sutil, hover con fondo `gray-50`
- **Íconos**: consistentes con la paleta — verde (`#1a5c2e`) y naranja (`#e8670c`)
- **Overlay**: `bg-black/40` detrás del drawer
- **Animación entrada**: `x: "100%" → x: 0` con spring suave (Framer Motion)
- **Animación salida**: `x: 0 → x: "100%"` con ease-out rápido
- **Barra de búsqueda**: bordes redondeados, ícono lupa, fondo `gray-100`
- **Acordeón FAQ**: chevron rotado al expandir, animación de altura con Framer Motion

---

## Orden de implementación

1. **Estructura base** — `HelpHub.tsx` + `HelpDrawer.tsx` con overlay y animación (sin contenido real aún)
2. **Vista menú** — `HelpMenu.tsx` con las 5 opciones y navegación entre vistas
3. **Vista FAQ** — `FaqView.tsx` con categorías, acordeón y búsqueda (reutiliza `faq-matcher.ts`)
4. **Vista legal** — `LegalView.tsx` + contenido en `data/legal.ts`
5. **Vista contacto** — `ContactView.tsx` integrando `ContactForm.tsx`
6. **Páginas públicas** — `/politicas` y `/terminos` (SEO + cumplimiento legal)
7. **Footer** — agregar links legales
8. **i18n** — agregar todas las keys en es.json y en.json
9. **Layout** — reemplazar `WhatsAppButton` + `ChatBot` por `HelpHub`
10. **Limpieza** — eliminar componentes reemplazados
11. **QA** — probar todas las vistas, búsqueda, formulario y WhatsApp en ambos idiomas

---

## Dependencias

- Framer Motion (ya instalado) — animaciones del drawer y acordeón
- Sin dependencias nuevas
- Sin backend adicional — el formulario de contacto ya tiene su API route

---

## Decisiones de diseño tomadas (no reabrir)

- **Búsqueda solo en FAQ** — Políticas y Términos no se indexan para búsqueda, se navegan directamente
- **WhatsApp abre en nueva pestaña** — única excepción aceptada de "salir del sitio"
- **Páginas /politicas y /terminos existen como rutas reales** — requerimiento legal colombiano (Ley 1581), aunque el contenido también se muestre en el drawer
- **ContactForm se reutiliza** — no se duplica lógica ni estilos, se renderiza dentro del drawer
- **Número WhatsApp en variable de entorno** — facilita configuración sin tocar código

---

## Estado actual

- [ ] Rama creada: `feat/help-hub-drawer` ✅
- [ ] Plan documentado ✅
- [ ] Implementación pendiente
