# Chatbot FAQ — Documentación técnica

**Commit:** `57d6ca3`
**Deploy:** https://mas-cerca-ap.vercel.app
**Fecha:** 2026-04-17

---

## Qué se implementó

Widget flotante de preguntas frecuentes client-side. Sin backend, sin dependencias nuevas. El usuario puede explorar categorías, seleccionar preguntas o escribir libremente. Si no hay respuesta disponible, se ofrece un botón directo a WhatsApp.

---

## Arquitectura

```
data/faq.ts          → Base de conocimiento estática
lib/faq-matcher.ts   → Lógica de búsqueda por keywords
components/ui/
  ChatBot.tsx        → Burbuja flotante (estado + toggle)
  ChatBotPanel.tsx   → Panel de chat completo
messages/es.json     → Strings UI en español
messages/en.json     → Strings UI en inglés
app/[lang]/layout.tsx → Integración en el layout
```

---

## Archivos creados

### `data/faq.ts`
Base de conocimiento con 5 categorías y 21 preguntas:

| Categoría | Preguntas |
|-----------|-----------|
| Productos | 6 |
| Pedidos y Entregas | 5 |
| Distribución / Mayoreo | 4 |
| Empresa | 3 |
| Proceso y Calidad | 3 |

Cada pregunta tiene: `id`, `question` (es/en), `answer` (es/en), `keywords[]`.

### `lib/faq-matcher.ts`
Función `findAnswer(query: string, lang: Locale): FAQMatch | null`

- Normaliza texto: lowercase + strip acentos + strip puntuación
- Tokeniza por espacios
- Score: keyword exacto = 2pts, keyword parcial = 1pt
- Threshold mínimo: 2pts (evita falsos positivos)
- Retorna `{ question, category, score }` o `null`

### `components/ui/ChatBot.tsx`
- `"use client"` — componente de cliente
- Estado: `isOpen: boolean`
- Posición: `fixed bottom-[5.5rem] right-6 z-50` (sobre el botón de WhatsApp)
- Animaciones de icono con Framer Motion (chat ↔ X)

### `components/ui/ChatBotPanel.tsx`
- Panel de 380px (desktop) / `calc(100vw - 2rem)` (mobile)
- `max-h-[500px]` con scroll interno en área de mensajes
- Flujo de UX:
  1. Bienvenida + chips de categorías
  2. Click categoría → chips de preguntas de esa categoría
  3. Click pregunta → respuesta del bot
  4. Input libre → matching por keywords → respuesta o fallback
  5. Fallback → botón "Hablar con una persona" (abre WhatsApp)
  6. Después de respuesta → feedback Sí/No (sin backend)

---

## Archivos modificados

### `messages/es.json` y `messages/en.json`
Keys agregadas bajo `"chatbot"`:

```
chatbot.title
chatbot.welcome
chatbot.placeholder
chatbot.fallback
chatbot.talkToHuman
chatbot.helpful
chatbot.yes / chatbot.no
chatbot.thankYou
chatbot.backToCategories
chatbot.categories
chatbot.ariaOpen / chatbot.ariaClose
```

### `app/[lang]/layout.tsx`
Agregado `<ChatBot />` dentro del `DictionaryProvider`, antes de `<WhatsAppButton />`.

---

## Consideraciones importantes

**Las respuestas del FAQ son placeholders.** Fueron elaboradas con información disponible en el sitio, pero deben ser validadas y aprobadas por el cliente antes de que el sitio quede en producción estable.

Para actualizar respuestas, editar directamente `data/faq.ts` — no requiere cambios en ningún otro archivo.

---

## Dependencias

Ninguna nueva. Framer Motion ya estaba instalado. No requiere backend, API keys ni servicios externos.
