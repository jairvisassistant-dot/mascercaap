# Plan: Chatbot FAQ — Mas Cerca AP

## Objetivo

Crear un bot de preguntas frecuentes con base de conocimiento predefinida sobre los procesos y modelo de negocio de Mas Cerca AP. Si el tema no está cubierto, redirigir al agente humano de servicio al cliente (WhatsApp).

**NO es un chatbot con IA generativa.** Es un sistema estructurado de Q&A con fallback a humano.

---

## Arquitectura Propuesta

### Opción A: Widget embebido con lógica client-side (RECOMENDADA)

- Componente React flotante (estilo burbuja en esquina inferior derecha, al lado del botón de WhatsApp)
- Base de conocimiento como JSON estático (se carga con el bundle, ~5-10KB)
- Búsqueda por keywords/categorías, sin backend adicional
- Fallback: botón que abre WhatsApp con mensaje pre-armado

**Pros:** Zero costo de infraestructura, zero latencia, funciona offline, sin dependencias externas
**Contras:** No aprende de interacciones, actualizar FAQ requiere deploy

### Opcion B: API route + matching más sofisticado

- API route `/api/chat` que recibe la pregunta y busca en la base de conocimiento
- Permite logging de preguntas sin respuesta para mejorar la FAQ
- Matching por similitud de texto (fuzzy search)

**Pros:** Puede loguear preguntas no respondidas, matching más inteligente
**Contras:** Requiere llamada al servidor por cada interacción, más complejidad

### Decision: Opción A

Justificación: el cliente necesita algo simple, mantenible y sin costo operativo. La base de conocimiento es estática y controlada. Si en el futuro necesitan analytics sobre preguntas, se puede migrar a Opción B sin reescribir el componente.

---

## Base de Conocimiento

### Estructura del JSON

```json
{
  "categories": [
    {
      "id": "productos",
      "label": { "es": "Productos", "en": "Products" },
      "icon": "🍊",
      "questions": [
        {
          "id": "que-productos",
          "question": { "es": "¿Qué productos ofrecen?", "en": "What products do you offer?" },
          "answer": { "es": "Ofrecemos zumos de...", "en": "We offer juices..." },
          "keywords": ["productos", "ofrecen", "venden", "products", "offer", "sell"]
        }
      ]
    }
  ],
  "fallback": {
    "es": "No tengo información sobre eso. ¿Te gustaría hablar con nuestro equipo?",
    "en": "I don't have information about that. Would you like to talk to our team?"
  }
}
```

### Categorias y preguntas a incluir

1. **Productos** (~6 preguntas)
   - ¿Qué productos ofrecen?
   - ¿Los jugos tienen conservantes o colorantes?
   - ¿Cuánto tiempo duran los productos?
   - ¿Cómo se conservan las pulpas?
   - ¿Tienen productos sin azúcar?
   - ¿Cuáles son los tamaños disponibles?

2. **Pedidos y Entregas** (~5 preguntas)
   - ¿Cómo hago un pedido?
   - ¿Cuál es el pedido mínimo?
   - ¿En qué zonas entregan?
   - ¿Cuánto tarda la entrega?
   - ¿Cuáles son los medios de pago?

3. **Distribución / Mayoreo** (~4 preguntas)
   - ¿Puedo ser distribuidor?
   - ¿Tienen precios para mayoreo?
   - ¿Qué requisitos necesito para ser distribuidor?
   - ¿Manejan marca blanca?

4. **Empresa** (~3 preguntas)
   - ¿Dónde están ubicados?
   - ¿Cuál es el horario de atención?
   - ¿Puedo visitar la bodega?

5. **Proceso y Calidad** (~3 preguntas)
   - ¿De dónde vienen las frutas?
   - ¿Tienen registro sanitario / INVIMA?
   - ¿Cuál es el proceso de producción?

> NOTA: Las respuestas exactas deben ser validadas con el cliente antes de implementar.

---

## Componentes a crear

### 1. `data/faq.ts`
- Base de conocimiento tipada
- Exporta categorías, preguntas y respuestas en ambos idiomas
- Keywords para matching

### 2. `components/ui/ChatBot.tsx`
- Componente principal (burbuja flotante)
- Estados: cerrado (solo icono), abierto (panel de chat)
- Posición: fixed bottom-right, arriba del botón de WhatsApp
- Animación de entrada/salida con Framer Motion
- Responsive: en mobile ocupa más ancho

### 3. `components/ui/ChatBotPanel.tsx`
- Panel del chat con:
  - Header con título + botón cerrar
  - Área de mensajes (scroll)
  - Chips de categorías para navegación rápida
  - Input de texto para búsqueda libre
  - Mensajes del bot y del usuario (burbujas)

### 4. `lib/faq-matcher.ts`
- Función `findAnswer(query: string, lang: Locale): FAQMatch | null`
- Matching por keywords (case-insensitive, sin acentos)
- Scoring: más keywords coinciden = mayor relevancia
- Threshold mínimo para evitar falsos positivos
- Si no hay match: retorna null → trigger fallback

### 5. Actualizar `app/[lang]/layout.tsx`
- Agregar `<ChatBot />` al layout (junto a WhatsAppButton)

---

## UX Flow

1. Usuario ve icono de chat (burbuja) en esquina inferior derecha
2. Click → se abre panel con mensaje de bienvenida + categorías como chips
3. Usuario puede:
   - **Tocar una categoría** → muestra las preguntas de esa categoría como botones
   - **Tocar una pregunta** → muestra la respuesta
   - **Escribir texto libre** → busca en keywords → muestra mejor match o fallback
4. Si no hay respuesta → mensaje de fallback + botón "Hablar con una persona" (abre WhatsApp)
5. Después de cada respuesta → chips "¿Te ayudó?" (Sí/No) para UX, sin backend

---

## i18n

- La base de conocimiento ya está bilingüe (es/en en cada pregunta/respuesta)
- El componente usa `useDictionary()` para textos del UI (bienvenida, placeholder, fallback)
- Agregar keys al diccionario:
  ```
  chatbot.welcome
  chatbot.placeholder
  chatbot.fallback
  chatbot.talkToHuman
  chatbot.helpful / chatbot.notHelpful
  chatbot.thankYou
  chatbot.title
  ```

---

## Diseño Visual

- Burbuja: circular, color primary, icono de mensaje
- Panel: 380px ancho (desktop), 100% - 32px (mobile), max-height 500px
- Header: gradient primary → primary-dark
- Mensajes bot: bg-gray-100, rounded, alineados a la izquierda
- Mensajes usuario: bg-primary, text-white, alineados a la derecha
- Chips categorías: pills con borde, hover primary
- Animaciones: slide-up para panel, fade para mensajes

---

## Orden de implementación

1. Crear `data/faq.ts` con estructura y contenido placeholder
2. Crear `lib/faq-matcher.ts` con lógica de búsqueda
3. Crear `ChatBotPanel.tsx` (UI del chat)
4. Crear `ChatBot.tsx` (burbuja + toggle + panel)
5. Agregar strings al diccionario (es.json / en.json)
6. Integrar en layout
7. Testear flujo completo en ambos idiomas
8. Validar contenido de FAQ con el cliente

---

## Dependencias

- Ninguna nueva. Se usa Framer Motion (ya instalado) para animaciones.
- No requiere backend adicional.
- No requiere API keys ni servicios externos.

---

## Estimación de archivos

| Archivo | Acción |
|---------|--------|
| `data/faq.ts` | Crear |
| `lib/faq-matcher.ts` | Crear |
| `components/ui/ChatBot.tsx` | Crear |
| `components/ui/ChatBotPanel.tsx` | Crear |
| `messages/es.json` | Actualizar (agregar chatbot.*) |
| `messages/en.json` | Actualizar (agregar chatbot.*) |
| `app/[lang]/layout.tsx` | Actualizar (agregar ChatBot) |
