# Respuesta a Auditoría de Código — 2026-04-26 21:07

## Metadatos
- **Auditoría origen:** `audit_code_20260426_2107.md`
- **Commit auditado:** `616af64213cf4c090501b19df284557399240fc8`
- **Fecha de respuesta:** 2026-04-26
- **Autor:** Jair Linan

---

## Resumen de Clasificación

| Hallazgo | Severidad | Clasificación | Acción |
|----------|-----------|---------------|--------|
| A11Y-03 — `ProductGridCard` div onClick sin accesibilidad | HIGH | ✅ Real | Corregir |
| BUG-07 — Grid/Lightbox muestran contenido en español en `/en` | HIGH | ✅ Real | Corregir |
| DT-07 — ChatBot / ChatBotPanel / WhatsAppButton código muerto | HIGH | ✅ Real | Corregir |
| A11Y-11 — `lang="es"` hardcodeado en root layout | HIGH | ⚠️ Conocido / No falso positivo | **No se corrige ahora** |
| BUG-07 — `LegalView.tsx` "Última actualización" sin locale | MED | ✅ Real | Corregir |
| UX-04 — Voseo rioplatense en sitio colombiano | MED | ✅ Real | Corregir |
| DT-04 — `href="#"` cuando falta `NEXT_PUBLIC_WHATSAPP_NUMBER` | MED | ❌ Falso positivo funcional | **No se corrige** |
| BUG-07 — Strings hardcodeados con voseo en páginas legales | MED | ✅ Real | Corregir |

---

## Hallazgos Confirmados (se corrigen)

Los siguientes 6 hallazgos se confirman como reales y se incluyen en el backlog de correcciones:

- **A11Y-03**: `ProductGridCard.tsx:25-28` — el `<div onClick>` no tiene `role="button"`, `tabIndex={0}` ni `onKeyDown`. Confirmado en código.
- **BUG-07 [HIGH]**: `ProductGridCard.tsx:90,95` y `ProductLightbox.tsx:49,54` — usan `product.name`, `product.description` e `product.ingredients` directamente desde los datos estáticos, saltándose el sistema i18n. Confirmado en código.
- **DT-07**: `ChatBot.tsx` no tiene importadores en el árbol de la app. Adicionalmente, su importación interna (`import nPanel from "./nPanel"`) referencia un nombre de archivo incorrecto — el archivo real es `ChatBotPanel.tsx` — lo que confirma que el módulo lleva tiempo fuera del árbol activo. `WhatsAppButton.tsx` (`components/layout/`) tampoco tiene importadores fuera de sí mismo; la app usa `AnimatedWhatsAppButton`, que es un componente distinto.
- **MED BUG-07 (LegalView)**: `LegalView.tsx:14` — el label "Última actualización" está hardcodeado en español. La fecha sí usa `locale` para el formato, pero el label visible no. Confirmado en código.
- **UX-04**: Voseo argentino (`Podés`, `Querés`, `Tenés`, `Escribinos`, `intentá`) confirmado en `messages/es.json`, `data/faq.ts`, y `app/api/contact/route.ts`. El sitio es colombiano y la convención documentada en `LECCIONES_APRENDIDAS.md` exige tuteo/neutro colombiano.
- **MED BUG-07 (páginas legales)**: `politicas/page.tsx:85,88` y `terminos/page.tsx:85,88` — strings visibles hardcodeados fuera del diccionario i18n y usando voseo. Confirmado en código.

---

## Hallazgos No Corregidos — Justificación Detallada

### [HIGH] A11Y-11 — `app/layout.tsx:24` — `<html lang="es">` hardcodeado

**Decisión:** No se corrige en este ciclo.

**Por qué NO es un falso positivo:** El hallazgo es correcto. Las rutas `/en/*` heredan `lang="es"`, lo cual es incorrecto para screen readers, traducción automática y señales SEO. El auditor tiene razón.

**Por qué no se corrige ahora:** Este problema ya estaba documentado ANTES de la auditoría. El propio código tiene el comentario explicativo en `app/layout.tsx:23`:

```
// lang="es" fijo por limitación de Next.js App Router — documentado en LECCIONES_APRENDIDAS.md
```

Y `LECCIONES_APRENDIDAS.md` (entrada #5) lo registra como limitación arquitectural conocida con la ruta de solución documentada: mover `<html>` y `<body>` al layout localizado `app/[lang]/layout.tsx`. Ese refactor implica evaluar el impacto en hidratación, fonts de Next.js (`next/font`) y cualquier lógica que dependa del root layout. No es un cambio atómico.

**Conclusión para el auditor:** No reportar como hallazgo nuevo en auditorías futuras. Ya existe conciencia del problema, está documentado, y la ruta de corrección también está documentada. Reportarlo de nuevo sin verificar `LECCIONES_APRENDIDAS.md` genera ruido de trazabilidad. Cuando se realice el refactor de layouts, este punto se cerrará.

---

### [MED] DT-04 — `href="#"` como fallback cuando `NEXT_PUBLIC_WHATSAPP_NUMBER` no está definido

**Decisión:** No se corrige. Falso positivo funcional.

**Código reportado:**
```tsx
const whatsappUrl = SITE_CONFIG.whatsappNumber
  ? `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=...`
  : "#";
```

**Por qué es un falso positivo:** `SITE_CONFIG.whatsappNumber` se deriva de `NEXT_PUBLIC_WHATSAPP_NUMBER`, que es una variable de entorno requerida para el funcionamiento del sitio. Está configurada en todos los entornos (local, staging, producción). El branch `"#"` es código defensivo para un escenario que NO ocurre en la ejecución real del proyecto.

Convertir este guard en un `disabled` visible o eliminar el CTA requeriría agregar complejidad de UI (manejo de estado, estilos de disabled) para proteger contra una condición de entorno que el proyecto nunca permite. Esto sería código para un escenario imposible.

**Condición que invalidaría esta decisión:** Si en algún momento el proyecto tuviera un entorno legítimo sin `NEXT_PUBLIC_WHATSAPP_NUMBER` (por ejemplo, un modo demo o un entorno de testing con variables reducidas), este punto deberá reabrirse y resolverse con `disabled` explícito o ocultando el CTA.

**Conclusión para el auditor:** No reportar como hallazgo en auditorías futuras mientras `NEXT_PUBLIC_WHATSAPP_NUMBER` sea una variable obligatoria en todos los entornos del proyecto. Verificar `lib/config.ts` y `.env.example` antes de reportar.
