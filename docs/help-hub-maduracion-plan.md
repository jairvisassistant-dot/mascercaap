# Plan técnico — Maduración de HelpHub + WhatsApp

Este plan define una evolución QUIRÚRGICA del centro de ayuda. La regla es simple: tocar solo las piezas específicas de HelpHub, FAQ y WhatsApp sin afectar lo que ya funciona bien en catálogo, admin, formularios o navegación general.

## Objetivo

Convertir HelpHub de un drawer útil en un centro de ayuda más maduro, con mejor trazabilidad, mejor derivación a humano y una experiencia de WhatsApp más consistente.

## Principios de implementación

1. Cambios pequeños y aislados.
2. Nada de reescrituras masivas.
3. Cada mejora debe tener un alcance funcional claro.
4. Mantener compatibilidad con los flujos actuales de FAQ, contacto y pedido.
5. Reutilizar lógica común antes de agregar nuevas variantes.

## Estado actual resumido

| Área | Estado actual | Pendiente |
|---|---|---|
| HelpHub | Drawer modular con scroll lock, persistencia de sesión y analítica mínima | Vista de seguimiento de ciclo de atención |
| FAQ | Editable desde admin con Supabase + fallback estático, matcher por tokens con scoring, keywords y multi-idioma | Inbox de consultas, FAQ por IA |
| WhatsApp | Builders unificados en `lib/whatsapp.ts`, entrada directa desde CTA, degradación elegante, trazabilidad de eventos | WhatsApp bidireccional (Business API), handoff con contexto real |
| Leads | Persistencia server-side, guardado desde FAQ, fix de stale sessionState, analítica de submit | Inbox interno de consultas, ciclo de atención |
| UX | CTA respeta intención primaria, drawer sin scroll fugado, lead form inline en chat | Mejora continua |

## Implementado hasta ahora

A continuación, el detalle de cada cambio ya implementado en el código base, con archivos y justificación técnica.

### 1. Entrada correcta a WhatsApp

**Qué cambió**: El CTA flotante de WhatsApp (`AnimatedWhatsAppButton`) ahora llama directamente a `openDrawer("whatsapp")` en lugar de `openDrawer("faq")`.

**Archivos**:
- `components/ui/AnimatedWhatsAppButton.tsx` — onClick hace `trackHelpHubEvent("helphub_whatsapp_cta_clicked")` seguido de `openDrawer("whatsapp")`.
- `lib/help-hub-context.tsx` — expone `initialView` en el contexto, permite `openDrawer(view)` con cualquier vista.
- `components/ui/HelpDrawer.tsx` — `useEffect` que escucha `initialView === "whatsapp"` y setea `view + whatsAppState` automáticamente.

**Justificación**: El usuario que toca un botón de WhatsApp espera ver opciones de WhatsApp, no caer en FAQ.

---

### 2. Scroll lock del drawer

**Qué cambió**: Al abrir HelpDrawer, se fija `document.body.style.overflow = "hidden"`. Al cerrar/desmontar se restaura el valor anterior.

**Archivo**: `components/ui/HelpDrawer.tsx` — `useEffect` con cleanup que restaura el overflow original.

**Justificación**: Drawers modales deben prevenir scroll del backdrop. Sin esto, el contenido del fondo sigue scrolleando y rompe la ilusión de modal.

---

### 3. Unificación de builders de WhatsApp

**Qué cambió**: Se creó `lib/whatsapp.ts` como fuente única para construir URLs y mensajes de WhatsApp. Todos los puntos que antes tenían lógica duplicada ahora importan desde ahí.

**Archivos**:
- `lib/whatsapp.ts` (nuevo) — exporta `buildWhatsAppMessage`, `buildWhatsAppAppUrl`, `buildWhatsAppWebUrl`, `buildWhatsAppLinks`.
- `components/ui/drawer-views/FaqView.tsx` — usa `buildWhatsAppMessage` y `buildWhatsAppLinks`.
- `components/ui/HelpDrawer.tsx` — usa `buildWhatsAppLinks` para estado inicial.
- `components/sections/ContactForm.tsx` — usa `buildWhatsAppMessage` y `buildWhatsAppAppUrl`.
- `lib/order-assistant.ts` — importa `buildWhatsAppAppUrl` y `buildWhatsAppMessage` (alias).

**Justificación**: Elimina duplicación de lógica de construcción de URLs de WhatsApp. Un solo cambio actualiza todos los puntos.

---

### 4. Degradación elegante cuando falta configuración

**Qué cambió**: Los componentes que dependen de `SITE_CONFIG.whatsappNumber` verifican su existencia antes de renderizar CTAs.

**Archivos**:
- `components/ui/drawer-views/WhatsAppConnectView.tsx` — evalúa `whatsappAvailable`, muestra advertencia ambar si no hay número configurado y oculta CTAs de abrir WhatsApp (sin embargo, el QR se genera si hay número).
- `components/ui/HelpDrawer.tsx` — `buildDefaultWhatsAppState` retorna URLs null si no hay número.
- `components/sections/ContactForm.tsx` — solo setea `whatsappUrl` si `SITE_CONFIG.whatsappNumber` existe.

**Justificación**: La app no debe romperse ni mostrar CTAs rotos si falta config. Degradación visible pero informativa.

---

### 5. Analítica mínima

**Qué cambió**: Se creó `lib/help-hub-analytics.ts` con función `trackHelpHubEvent`. Se instrumentaron eventos clave en los flujos de FAQ y WhatsApp.

**Eventos registrados**:
| Evento | Disparador |
|---|---|
| `helphub_whatsapp_cta_clicked` | Click en botón flotante de WhatsApp |
| `helphub_faq_no_match` | FAQ falla en encontrar respuesta |
| `helphub_advisor_cta_clicked` | Click en "hablar con asesor" |
| `helphub_lead_submit_result` | Resultado del envío de lead |
| `helphub_whatsapp_opened` | Salida a WhatsApp (app o web) |

**Archivos**:
- `lib/help-hub-analytics.ts` (nuevo) — función única que emite a `gtag`, `dataLayer` y `CustomEvent`.
- `components/ui/AnimatedWhatsAppButton.tsx` — track CTA click.
- `components/ui/drawer-views/FaqView.tsx` — track no-match, advisor click, lead submit, whatsapp opened.
- `components/ui/drawer-views/WhatsAppConnectView.tsx` — track whatsapp opened.

**Justificación**: Trazabilidad mínima para medir efectividad del centro de ayuda. Desacoplado de proveedor específico (funciona con gtag o dataLayer).

---

### 6. Persistencia de sesión HelpHub/FAQ

**Qué cambió**: El drawer guarda su vista actual en `sessionStorage` al navegar, y FaqView persiste todo el estado del chat (mensajes, vista, lead form, datos ingresados).

**Archivos**:
- `components/ui/HelpDrawer.tsx` — persiste `view` y `whatsAppState` bajo clave `helphub:drawer-session:v1`; rehidrata si `shouldRestoreSession` es `true`.
- `components/ui/drawer-views/FaqView.tsx` — persiste mensajes, chatView, selectedCategoryId, estados de UI, leadData y leadConsent bajo `helphub:faq-session:v1`; rehidrata en mount si el locale coincide.
- `components/ui/HelpHub.tsx` — pasa `{ restoreSession: true }` al abrir el drawer.

**Justificación**: Mejora UX evitando que el usuario pierda contexto al cerrar/reabrir el drawer. La sesión es por pestaña (sessionStorage).

---

### 7. Fix de persistencia stale del lead form

**Qué cambió**: `persistFaqSession` limpia `sessionStorage` si hay `drawerContext?.product` (contexto de producto), y después de submit/skip de lead se persiste un estado limpio (ocultando el form).

**Archivo**: `components/ui/drawer-views/FaqView.tsx`
- Línea 72-74: `if (drawerContext?.product) { sessionStorage.removeItem(...); return; }`
- Líneas 292-296 y 309-313: `persistFaqSession({ showLeadForm: false, ... })` después de submit o skip.

**Justificación**: Prevenía que el formulario de lead apareciera fantasma en sesiones posteriores o que el estado de producto contaminara la sesión general.

---

### 8. Mejora del matcher FAQ

**Qué cambió**: Se reescribió `lib/faq-matcher.ts` con un sistema de scoring basado en tokens. Reemplaza el matcher simple anterior.

**Algoritmo**:
1. Tokenización por idioma con stop words (es/en).
2. Matching por frase completa: +4 si el query contiene una frase clave.
3. Matching por token individual: +2 o +3 según longitud del token.
4. Matching por prefijo: +1 si un token es prefijo de otro.
5. Pesos: question (1x), category (1x), answer (0.5x), keywords (1.5x).
6. Umbral mínimo: score < 3 → no match.

**Archivo**: `lib/faq-matcher.ts` — función `findAnswer(query, lang, faqData) → FAQMatch | null`.

**Justificación**: Mucho más preciso que un simple `includes()`. Tolera variaciones, sinónimos parciales, y prioriza matches semánticos sobre literales.

---

### 9. Base editable FAQ con Supabase + fallback estático

**Qué cambió**: El FAQ ahora se lee desde Supabase en server-side (`lib/faq-data.ts`). Si Supabase no está disponible, cae al estático (`data/faq.ts`). Se crearon tablas `faq_categories`, `faq_questions` y `faq_config`.

**Arquitectura**:
- `lib/faq-data.ts` — "server-only", consulta Supabase, mapea rows al tipo `FAQData`, usa fallback si no hay datos.
- `lib/faq-provider.tsx` — contexto cliente que recibe `FAQData` desde el layout server component.
- `app/[lang]/layout.tsx` — llama `getFAQData()` y lo pasa a `<FAQProvider>`.
- `app/api/admin/faq/route.ts` — API REST con CRUD completo (GET, POST, PUT, PATCH, DELETE) para categorías, preguntas y config.
- `data/faq.ts` — se mantiene como fallback estático. Ya no es fuente de verdad.

**Tablas Supabase**:
- `faq_categories`: id, label_es, label_en, icon, display_order, active
- `faq_questions`: id, category_id, question_es, question_en, answer_es, answer_en, keywords, display_order, active
- `faq_config`: id, fallback_es, fallback_en

**Justificación**: El FAQ se vuelve configurable sin deploy. El fallback estático garantiza que la app nunca se quede sin FAQ incluso si Supabase falla.

---

### 10. UI admin de FAQ

**Qué cambió**: Se creó la vista de administración de FAQ en `/admin/faq` con interfaz completa para gestionar categorías y preguntas.

**Archivos**:
- `app/admin/faq/page.tsx` — server component que carga datos desde Supabase y renderiza `FAQAdminClient`.
- `app/admin/faq/FAQAdminClient.tsx` — componente cliente orquestador con todo el estado y handlers.
- `app/admin/faq/components/types.ts` — tipos compartidos entre componentes.
- `app/admin/faq/components/CategoryEditForm.tsx` — formulario de edición de categoría.
- `app/admin/faq/components/QuestionEditForm.tsx` — formulario de edición de pregunta.
- `app/admin/faq/components/NewQuestionForm.tsx` — formulario de nueva pregunta.
- `app/admin/faq/components/ConfigSection.tsx` — sección de configuración de mensaje fallback.

**Funcionalidad**:
- Listado de categorías con orden por drag (up/down).
- Creación de categorías desde UI admin (id, label ES/EN, icono).
- Edición inline de categorías (label ES/EN, icono).
- Soft delete de categorías y preguntas (`active: false`).
- Creación de preguntas dentro de una categoría.
- Edición de preguntas (ES/EN + keywords separadas por coma).
- Configuración del mensaje de fallback sin deploy.
- Estados optimísticos en reordenamiento.
- Revalidación explícita de superficies FAQ tras cada mutación admin.

**Justificación**: El negocio puede gestionar FAQ sin intervención técnica. Elimina la barrera de tener que editar código para cambiar contenido de ayuda. La revalidación explícita evita depender solo del ciclo natural de ISR y asegura que HelpHub, layout y panel admin reflejen los cambios de FAQ de forma coherente después de crear, editar, reordenar o desactivar contenido.

---

### 11. Handoff con contexto real

**Qué cambió**: Antes de abrir WhatsApp desde el flujo de asesor en HelpHub, ahora se construye un resumen legible del handoff, se guarda junto al lead y se dispara una notificación interna por email al equipo.

**Archivos**:
- `lib/handoff-summary.ts` — utilidad compartida para resumir el contexto del handoff.
- `lib/schemas/lead.ts` — extiende el schema con `resumen_handoff`.
- `components/ui/drawer-views/FaqView.tsx` — envía el resumen junto al lead antes del handoff.
- `app/api/leads/route.ts` — guarda el resumen en Supabase y envía notificación interna fail-safe.

**Funcionalidad**:
- Resume nombre, tipo, producto de interés, cantidad de consultas y última pregunta del usuario.
- Persiste el resumen junto al lead para trazabilidad futura.
- Envía email interno usando el patrón existente de Resend.
- Si la notificación falla, el lead igual se guarda y WhatsApp se abre normalmente.

**Justificación**: El handoff deja de ser un simple “abrir wa.me” y pasa a tener contexto operativo útil. Esto mejora tiempos de respuesta, evita que el asesor llegue “a ciegas” y deja una base concreta para el futuro inbox interno de consultas.

## Fase 2 — Maduración funcional

Objetivo: volver a HelpHub más persistente, configurable y operativo.

### 6. Persistencia de sesión del drawer
- Guardar vista actual, historial básico y contexto mínimo en `sessionStorage`.
- Rehidratar al reabrir.

### 7. FAQ editable
- Sacar conocimiento de `data/faq.ts` como única fuente.
- Primera versión: lectura desde Supabase con fallback estático.

### 8. Mejor matcher
- Mantener compatibilidad actual pero sumar:
  - matching por idioma
  - sinónimos
  - tolerancia básica a variaciones

### 9. Handoff con contexto real
- Antes de abrir WhatsApp, guardar lead + resumen de conversación.
- Notificar internamente al equipo.

### 10. Modelo de contacto más consistente
- Alinear consultas, leads y pedidos bajo una semántica de seguimiento común.

## Fase 3 — Operación madura

Objetivo: convertir ayuda + WhatsApp en un sistema operable por negocio.

### 11. Inbox interno de consultas
- Vista admin para leads, pedidos y consultas.

### 12. Estado del ciclo de atención
- `nuevo | contactado | convertido | perdido`

### 13. WhatsApp bidireccional
- Evaluar integración con WhatsApp Business API o proveedor externo.

### 14. Administración de FAQ desde panel
- Alta, edición, orden y desactivación sin deploy.

## Orden sugerido de ejecución

1. Entrada correcta a WhatsApp
2. Scroll lock del drawer
3. Unificación de builders de WhatsApp
4. Degradación elegante por falta de config
5. Instrumentación mínima
6. Persistencia de sesión
7. FAQ editable
8. Matcher mejorado
9. Handoff con contexto
10. Seguimiento operativo

## Alcance de la rama `feat/help-hub-maturation`

Esta rama implementó la totalidad del plan de maduración (Fase 1 + Fase 2 + ítems 10 y 14 de Fase 3):

- ✅ entrada correcta a WhatsApp
- ✅ scroll lock del drawer
- ✅ unificación de builders de WhatsApp en `lib/whatsapp.ts`
- ✅ degradación elegante sin WhatsApp configurado
- ✅ analítica mínima (`lib/help-hub-analytics.ts`)
- ✅ persistencia de sesión HelpHub/FAQ (`sessionStorage`)
- ✅ fix de persistencia stale del lead form
- ✅ mejora del matcher FAQ (`lib/faq-matcher.ts` — scoring por tokens)
- ✅ FAQ editable con Supabase + fallback estático (`lib/faq-data.ts`, API `/api/admin/faq`)
- ✅ UI admin FAQ completa (`/admin/faq`, refactorizada con `components/`)

## Criterio de aceptación por fase

### Fase 1
- El CTA de WhatsApp respeta la intención del usuario.
- El drawer no deja scrollear el fondo.
- La lógica de URLs/mensajes de WhatsApp deja de estar duplicada o queda encaminada a una única fuente.
- No se rompe FAQ, contacto ni Order Assistant.

### Fase 2
- HelpHub puede retomar contexto.
- FAQ deja de depender solo de código estático.
- El negocio gana trazabilidad mínima.

### Fase 3
- El equipo puede operar consultas y medir resultado real.

## Fuera de alcance por ahora

- Reescribir todo HelpHub
- Reemplazar de inmediato el matcher por IA
- Cambiar el diseño visual general del sitio
- Tocar admin, catálogo o páginas legales sin necesidad directa

## Riesgos a controlar

- No mezclar mejoras de producto con refactors grandes.
- No tocar más de lo necesario por iteración.
- No duplicar otra vez la lógica de WhatsApp en nuevos archivos.

## Próximo paso — Pendiente de activación externa

La rama implementó Fase 1, Fase 2 y la mayoría de Fase 3. El siguiente paso requiere gestión externa:

- **WhatsApp bidireccional** (Fase 3 #13): la infraestructura mínima está preparada (`app/api/webhooks/whatsapp/route.ts` y variable `WHATSAPP_WEBHOOK_VERIFY_TOKEN` en entorno). Para activarlo se necesita:
  1. Número de teléfono verificado en WhatsApp Business.
  2. Cuenta de Meta Business verificada (documentación, días a semanas).
  3. Contratar un BSP (Business Solution Provider: Twilio, WATI, 360dialog, etc.).
  4. Configurar el webhook apuntando a `{SITE_URL}/api/webhooks/whatsapp`.
  5. Crear y aprobar plantillas de mensaje en Meta.
  
  **Costo estimado**: USD 0–59/mes según proveedor. Mensajes de servicio (consultas entrantes) son gratis. Costo real para el volumen actual del proyecto: marginal.

---

## Implementado recientemente

### 12. Inbox interno de consultas + ciclo de atención

**Qué cambió**: Se implementó la vista admin de consultas en `/admin/consultas` con filtros, listado de leads y gestión del ciclo de atención.

**Columnas agregadas a `leads`**:
- `estado_seguimiento text not null default 'nuevo'`
- `notas text`

**API**:
- `GET /api/admin/leads` — lista leads con filtros por `tipo`, `fuente`, `estado`
- `PATCH /api/admin/leads` — actualiza `estado_seguimiento` y/o `notas` de un lead por `id`

**Archivos creados**:
- `supabase/migrations/20260513000003_leads_add_seguimiento.sql` — migración con las columnas nuevas, policy RLS y trigger updated_at
- `app/api/admin/leads/route.ts` — API REST para leads admin (GET con filtros + PATCH)
- `app/admin/consultas/page.tsx` — server component que protege con `requireAdminSession()`, carga leads desde Supabase y pasa al client component
- `app/admin/consultas/ConsultasList.tsx` — client component con filtros por tipo/fuente/estado, listado de cards expandibles, cambio inline de estado de seguimiento y edición de notas

**Archivos modificados**:
- `lib/schemas/admin.ts` — agregado `leadUpdateSchema` (Zod)
- `components/layout/AdminNavbar.tsx` — agregado link a "Consultas" en la barra de navegación admin y sección `isConsultaPage` con botón ← Volver
- `types/index.ts` — agregado tipo `LeadRow`

**Funcionalidad**:
- Filtros combinables por tipo (pedido, mayoreo, consulta), fuente (chatbot_web, order_assistant) y estado de seguimiento
- Cards con info resumida: nombre, email, tipo, fuente, producto, fecha, estado actual
- Expansión para ver preguntas realizadas, resumen de handoff y datos adicionales
- Cambio de estado con menú desplegable inline (nuevo → contactado → convertido → perdido)
- Edición de notas internas con guardado inline
- Estados optimísticos en actualizaciones, revalidación tras cada mutación
