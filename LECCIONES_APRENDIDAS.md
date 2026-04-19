# Lecciones Aprendidas — Mas Cerca AP

> Documento vivo. Actualizar después de cada auditoría o bug en producción.
> Propósito: que el agente de IA (y el equipo) no repita los mismos errores.

---

## CAUSA RAÍZ DE LOS PROBLEMAS ENCONTRADOS

La mayoría de los 35 hallazgos de la auditoría 2026-04-19 comparten causas raíz comunes.
Entender el POR QUÉ es más valioso que memorizar el QUÉ.

---

## CAUSA RAÍZ #1 — Falta de fuente de verdad única para datos de contacto

**Qué pasó:** El teléfono `+57 300 123 4567` y el email `apalejandraplata@gmail.com` aparecieron hardcodeados en 4+ archivos distintos (`lib/config.ts`, `data/faq.ts` x2, `data/salesPoints.ts`).

**Por qué ocurrió:** Al agregar el chatbot FAQ, se volvieron a escribir los datos de contacto en el texto de las respuestas en lugar de importar `SITE_CONFIG` que ya existía para ese propósito exacto.

**Regla derivada:** `lib/config.ts` → `SITE_CONFIG` es la ÚNICA fuente de verdad para datos de contacto. Cualquier referencia a teléfono o email en CUALQUIER archivo del proyecto debe importar desde ahí. Nunca hardcodear. Esto incluye archivos `.ts` de datos estáticos como `data/faq.ts`.

**Archivos afectados:** `lib/config.ts`, `data/faq.ts`, `data/salesPoints.ts`

---

## CAUSA RAÍZ #2 — Arquitectura de i18n basada en Context obliga a "use client" en exceso

**Qué pasó:** 20+ componentes eran Client Components únicamente porque usaban `useDictionary()` (Context), incluso componentes que solo renderizaban texto con animaciones `whileInView`. Esto inflaba el bundle JS inicial y causaba lentitud perceptible.

**Por qué ocurrió:** El patrón de Context/Provider es conveniente de implementar, pero en Next.js App Router es arquitecturalmente incorrecto para datos que vienen del servidor. El diccionario se carga en el servidor (`getDictionary`) pero se redistribuye via Context en el cliente, forzando que todos los consumidores sean Client Components.

**Regla derivada:** En Next.js App Router, los datos del servidor (como el diccionario i18n) deben pasarse como **props** desde el Server Component padre, NO via Context. Context solo es válido para estado genuinamente interactivo (Navbar, ChatBot, etc.). Cuando un componente solo necesita el diccionario para renderizar, recibirlo como prop permite que sea un RSC en el futuro.

**Patrón correcto:**
```tsx
// ❌ MAL — fuerza "use client"
export function WhyChooseUs() {
  const { dict } = useDictionary(); // Context en un componente que solo renderiza
  return <section>...</section>;
}

// ✅ BIEN — dict como prop, arquitecturalmente correcto
export function WhyChooseUs({ dict }: { dict: Dictionary }) {
  return <section>...</section>;
}
```

**Archivos afectados:** `WhyChooseUs.tsx`, `FeaturedProducts.tsx`, `DailyOffer.tsx`, y potencialmente todos los que usen `useDictionary()` sin estado interactivo propio.

---

## CAUSA RAÍZ #3 — Importar `motion` en vez de `m` de Framer Motion

**Qué pasó:** Todos los componentes importaban `motion` (bundle completo ~50KB) en lugar de `m` con `LazyMotion` (~18KB). Con 10+ componentes usando `motion`, el costo se multiplicaba.

**Por qué ocurrió:** `import { motion } from "framer-motion"` es el ejemplo más común en la documentación de Framer Motion y en tutoriales. La alternativa `LazyMotion + m` requiere un paso de configuración inicial que no se hizo.

**Regla derivada:** SIEMPRE usar `LazyMotion` con `domAnimation` en el root del árbol de componentes y usar `m` en lugar de `motion` en todos los componentes. `LazyMotion` ya está configurado en `DictionaryProvider.tsx`. Nunca agregar `import { motion }` sin antes verificar si se puede usar `m`.

**Patrón correcto:**
```tsx
// ❌ MAL — descarga 50KB de features de Framer Motion en el bundle del componente
import { motion } from "framer-motion";
<motion.div animate={...}>

// ✅ BIEN — usa features lazy-loaded desde LazyMotion (ya configurado en DictionaryProvider)
import { m } from "framer-motion";
<m.div animate={...}>
```

**Nota:** `AnimatePresence` y `useInView` se siguen importando de `"framer-motion"` directamente. Solo `motion` se reemplaza por `m`.

---

## CAUSA RAÍZ #4 — Textos hardcodeados en idioma incorrecto (alt text en inglés)

**Qué pasó:** 6 atributos `alt` de imágenes en la página `/nosotros` estaban en inglés (`"Orange selection at sunrise"`, `"Direct purchase from farmer"`, etc.) en un sitio cuyo idioma primario es español.

**Por qué ocurrió:** Las imágenes se agregaron copiando nombres descriptivos en inglés directamente del asset original o del repositorio de imágenes, sin traducirlos. El error pasó desapercibido porque los `alt` no son visibles en la UI.

**Regla derivada:** Los atributos `alt` son contenido accesible visible a screen readers. Deben estar en el idioma de la interfaz. Si el componente es multilenguaje, el `alt` debe estar en el diccionario i18n. Si no es multilenguaje, en español como idioma primario.

---

## CAUSA RAÍZ #5 — Lógica de UI incompleta (handleFeedback ignoraba su parámetro)

**Qué pasó:** `handleFeedback(helpful: boolean)` en `ChatBotPanel.tsx` tenía el mismo cuerpo en ambas ramas del `if`, ignorando el valor de `helpful`. Ambos botones ("Sí" y "No") producían la misma respuesta.

**Por qué ocurrió:** La función fue escrita como scaffold/placeholder durante el desarrollo inicial del chatbot. Al terminar la implementación base, la lógica diferenciada nunca se completó. Pasó a producción sin review.

**Regla derivada:** Cada función con un parámetro booleano o union type debe tener lógica diferente en CADA rama. Si una función ignora su parámetro, no necesita ese parámetro. Antes de hacer commit, verificar que los parámetros de todas las funciones se usen realmente.

---

## CAUSA RAÍZ #6 — Datos del FAQ desincronizados con el catálogo real

**Qué pasó:** Las respuestas del FAQ sobre tamaños disponibles mencionaban presentaciones incorrectas (250ml, 500ml, 1L para zumos; 100g, 250g, 500g para pulpas), que no coincidían con el catálogo real (350ml, 600ml, 1L, 2L, 5L; 120g, 300g, 1000g).

**Por qué ocurrió:** El FAQ se escribió antes de finalizar el catálogo de productos, usando valores de ejemplo. Cuando el catálogo se actualizó, el FAQ no se sincronizó.

**Regla derivada:** El FAQ es contenido que el usuario ve y en el que confía para tomar decisiones de compra. Toda información de producto en el FAQ (precios, tamaños, tiempos de entrega) debe verificarse contra `data/products.ts` o Sanity antes de deploy. Idealmente, las respuestas del FAQ sobre productos deben generarse dinámicamente desde el catálogo.

---

## CAUSA RAÍZ #7 — `presentationOrder` sin namespace por línea de producto

**Qué pasó:** Los productos de Tomate de Árbol tenían `presentationOrder: 19, 20, 21` en lugar de `1, 2, 3`, colisionando con los valores de Guayaba.

**Por qué ocurrió:** Al agregar una nueva línea de producto, se continuó la numeración global en lugar de resetear por línea. El campo se llama "presentationOrder" pero la convención real es "orden dentro de la línea".

**Regla derivada:** `presentationOrder` es un índice POR LÍNEA DE PRODUCTO (1, 2, 3 para cada línea, independientemente de otras líneas). Al agregar una línea nueva, siempre empezar en 1. Comentado en `data/products.ts` para referencia futura.

---

## CAUSA RAÍZ #8 — Middleware nombrado incorrectamente (proxy.ts en lugar de middleware.ts)

**Qué pasó:** El archivo de middleware de Next.js estaba nombrado `proxy.ts` en lugar del nombre convencional `middleware.ts`. Next.js busca específicamente `middleware.ts` en la raíz del proyecto.

**Por qué ocurrió:** El archivo fue creado con un nombre descriptivo de su función ("proxy de idioma") sin respetar la convención de Next.js.

**Regla derivada:** El middleware de Next.js SIEMPRE debe estar en `middleware.ts` (o `middleware.js`) en la raíz del proyecto. No hay excepciones. Next.js no busca otros nombres. El archivo fue renombrado a `middleware.ts` el 2026-04-19.

---

## CAUSA RAÍZ #9 — console.error exponiendo objetos de error completos en logs de producción

**Qué pasó:** `console.error("Error al enviar email:", error)` en la API route de contacto logueaba el objeto `error` completo. Si el error venía de Resend con el cuerpo del request adjunto, los datos del usuario (PII) podían aparecer en los logs de Vercel.

**Por qué ocurrió:** El catch block fue escrito rapidamente. Loguear el objeto `error` directamente es el default intuitivo pero inseguro en serverless.

**Regla derivada:** En API routes, SIEMPRE loguear `error instanceof Error ? error.message : 'unknown error'` en lugar del objeto completo. El stack trace de Vercel/Cloudwatch captura el contexto necesario para debugging sin exponer datos de usuarios.

---

## CAUSA RAÍZ #10 — aria-labels hardcodeados en lugar de usar el diccionario i18n

**Qué pasó:** Los botones de navegación de `PulpaFruitGrid.tsx` tenían `aria-label="Ver anteriores"` y `aria-label="Ver más sabores"` hardcodeados en español, haciéndolos incorrectos en la versión `/en/` del sitio.

**Por qué ocurrió:** Al implementar el componente, se priorizó la funcionalidad sobre la internacionalización. Los aria-labels son texto "invisible" que se omite del checklist visual de testing.

**Regla derivada:** TODO texto visible o audible por el usuario (incluyendo `aria-label`, `title`, `placeholder`, `alt`) debe venir del diccionario i18n. No hay excepciones para componentes que existen en rutas multilanguage.

---

## REGLAS GENERALES DE ARQUITECTURA (para no repetir nada de lo anterior)

### Next.js App Router

1. **Client Components**: Solo usar `"use client"` si el componente usa hooks de estado, eventos del browser, o APIs exclusivas del cliente. Recibir `dict` como prop desde el Server Component padre es SIEMPRE preferible a usar `useDictionary()`.

2. **LazyMotion**: Siempre usar `m` en lugar de `motion`. `LazyMotion` ya está configurado en `DictionaryProvider.tsx`. Si se necesita agregar un nuevo componente con animaciones, usar `import { m } from "framer-motion"`.

3. **Middleware**: El archivo debe llamarse `middleware.ts` en la raíz. Sin excepciones.

4. **Sitemap**: La fecha en `sitemap.ts` es fija intencional. No cambiar a `new Date()` — rompe la determinism del build.

5. **lang en root layout**: `app/layout.tsx` tiene `lang="es"` hardcodeado por limitación arquitectural. La versión `/en/` lo hereda. Para fijar esto se debe mover `<html>` y `<body>` a `app/[lang]/layout.tsx`.

### Datos y Configuración

6. **Datos de contacto**: Toda referencia a teléfono, email o WhatsApp → `SITE_CONFIG` en `lib/config.ts`. Cero excepciones.

7. **Tipos compartidos**: Todos los tipos van en `types/index.ts`. No definir tipos en archivos de datos o componentes.

8. **presentationOrder**: Es un índice por línea (1, 2, 3). Siempre resetear a 1 al iniciar una nueva línea de producto.

9. **FAQ vs. catálogo**: Verificar que los tamaños, precios y presentaciones del FAQ coincidan con `data/products.ts` antes de cada deploy.

### Seguridad

10. **console.error**: Nunca loguear el objeto `error` completo. Usar `error instanceof Error ? error.message : 'unknown'`.

11. **PII en logs**: Ningún dato del usuario (nombre, email, teléfono) debe aparecer en logs de servidor.

### Accesibilidad

12. **aria-label e i18n**: Todo `aria-label` en componentes que existen en múltiples idiomas debe venir del diccionario.

13. **alt text**: Siempre en el idioma de la interfaz. Si el componente es multilenguaje, el alt va en el diccionario.

### Calidad de Código

14. **Parámetros sin usar**: Si una función recibe un parámetro que no usa en todas sus ramas, es un bug. Verificar antes de commit.

15. **Código muerto**: Los componentes sin importadores deben documentarse o eliminarse. No dejar componentes huérfanos sin contexto — son ruido en auditorías futuras.

16. **Schemas Zod con mensajes hardcodeados en un solo idioma**: Si el schema usa mensajes de validación fijos (ej. en español), los usuarios en otros idiomas ven errores en el idioma incorrecto. Usar `createContactSchema(msgs)` con mensajes como parámetro y pasarlos desde el diccionario i18n.

---

---

## CAUSA RAÍZ #11 — Schema Zod con mensajes de error en un solo idioma

**Qué pasó:** `lib/schemas/contact.ts` tenía los mensajes de validación hardcodeados en español. Los usuarios en la versión `/en/` del sitio veían errores como *"El nombre debe tener al menos 2 caracteres"* en lugar de *"Name must be at least 2 characters"*.

**Por qué ocurrió:** El schema Zod fue escrito al principio del proyecto como un módulo estático. En ese momento solo existía el idioma español. Al agregar i18n al sitio, los mensajes de validación quedaron afuera del sistema de traducción. Las claves `contact.validation` se agregaron al JSON pero nunca se conectaron al schema.

**Cómo se detectó:** Auditoría de código muerto — `contact.validation` existía en los JSONs pero ningún componente la referenciaba. Al investigar por qué, se descubrió el bug de localización.

**Cómo se arregló:** `contactSchema` estático se convirtió en `createContactSchema(msgs)`, una función que acepta los mensajes de validación como parámetro. `ContactForm.tsx` la llama con `dict.contact.validation`. La API route sigue usando el schema estático en español (es server-side, no visible al usuario).

**Regla derivada:** Todo schema Zod que valide input de usuario VISIBLE debe aceptar mensajes localizados. El patrón correcto es `createXxxSchema(msgs)` — una función factory que recibe mensajes del diccionario. Nunca hardcodear strings de error en un schema compartido entre cliente y servidor.

**Patrón correcto:**
```typescript
// ❌ MAL — mensajes hardcodeados, solo funciona en un idioma
export const contactSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

// ✅ BIEN — mensajes como parámetro, localizables
export function createContactSchema(msgs: ContactValidationMessages) {
  return z.object({
    nombre: z.string().min(2, msgs.nameMin),
  });
}
// En el componente: zodResolver(createContactSchema(dict.contact.validation))
```

**Archivos afectados:** `lib/schemas/contact.ts`, `components/sections/ContactForm.tsx`, `messages/es.json`, `messages/en.json`

---

## HISTORIAL DE AUDITORÍAS

| Fecha | Hallazgos | CRIT | HIGH | MED | LOW | INFO |
|-------|-----------|------|------|-----|-----|------|
| 2026-04-18 | 14 | 0 | 3 | 6 | 3 | 2 |
| 2026-04-19 | 35 | 0 | 6 | 18 | 10 | 1 |

> La auditoría de 2026-04-19 encontró más hallazgos porque fue más exhaustiva (44 archivos revisados, 8 categorías) y porque se agregaron componentes nuevos (chatbot, lácteos, segmento pulpas) desde la auditoría anterior.
