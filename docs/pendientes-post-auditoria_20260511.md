# Pendientes Post-Auditoría — 2026-05-11

Hallazgos abiertos tras verificación de 4 commits correctivos (`920eab4`, `4053fcb`, `9267c03`, `f987b49`). 10/10 hallazgos nuevos y 8/12 previos fueron resueltos.

---

## Persistentes desde auditorías originales (nunca tocados)

### P-01 — Zod monolingüe (CR#11 · HIGH)
- **Archivo:** `lib/schemas/contact.ts`
- **Problema:** Mensajes de validación Zod hardcodeados en español. En locale `en` el usuario recibe errores en español.
- **Fix:** Usar `messages/*.json` o función que resuelva idioma desde headers/lang.

### P-02 — Overlines hardcodeados (CR#12 · LOW)
- **Archivos:** WhyChooseUs, FeaturedProducts, galería, otras secciones
- **Problema:** Textos de etiqueta/sección como "Por qué elegirnos" fuera del diccionario i18n.
- **Fix:** Agregar claves `sectionLabel` al diccionario y consumirlas desde los componentes.

---

## Persistentes desde verification_20260511_1950.md

### P-03 — DictionaryProvider alta superficie cliente (MED)
- **Problema:** 40+ archivos con `"use client"` por usar Context de i18n. Sin migración estructural.
- **Decisión del desarrollador:** Justificado (no hay plan de migración).

### P-04 — Doble fuente de verdad del catálogo (MED)
- **Archivos:** `data/products.ts`, `lib/order-assistant.ts` (PRICES_COP)
- **Problema:** `data/products.ts` con 47 productos y `PRICES_COP` coexisten con Supabase como fuente única.
- **Decisión del desarrollador:** Diferido.

### P-05 — SEC-07: Admin pages sin validar ADMIN_EMAIL (HIGH)
- **Archivo:** `lib/admin-session.ts`
- **Problema:** `requireAdminSession()` valida token JWT pero no que el email del usuario sea `ADMIN_EMAIL`. Defensa en profundidad incompleta.
- **Fix:** Agregar `email === ADMIN_EMAIL` check.

### P-06 — OrderAssistant /en/ parcialmente español (HIGH)
- **Archivo:** `lib/order-assistant.ts:73-91`
- **Problema:** `ZONE_LABELS`, `URGENCY_LABELS`, `PROFILE_LABELS` hardcodeados en español. Usuarios `/en/` ven zonas/urgencias/perfiles en español.
- **Fix:** Mover al diccionario `messages/*.json`.

### P-07 — OrderAssistant catálogo paralelo (HIGH)
- **Archivo:** `lib/order-assistant.ts` (PRICES_COP, LACTEOS_PRICES)
- **Problema:** Precios duplicados del catálogo como fuente paralela. Mejoraron (actualizados a valores reales) pero el patrón persiste.

---

## Issues detectados en verification_20260511_1950.md (no corregidos)

### P-08 — Bloque `whatsapp` en JSON sin uso claro (MED)
- **Archivos:** `messages/es.json`, `messages/en.json`
- **Problema:** Clave `whatsapp.message` definida. Consumidores usan `t.whatsappMessage`/`t.whatsappMsg` — verificar si hay mapeo o está huérfano.

### P-09 — `label="Limón"` hardcodeado en BrandFruitMark (LOW)
- **Archivo:** `components/ui/BrandFruitMark.tsx:11`
- **Problema:** Label accesible hardcodeado. En `/en/` sigue diciendo "Limón".
- **Fix:** Recibir como prop o usar `productLines.limon.label`.

### P-10 — `whatsappNumber` sin validación (LOW)
- **Archivo:** `lib/config.ts`
- **Problema:** Si `NEXT_PUBLIC_WHATSAPP_NUMBER` falta, produce `""` y genera links rotos.

### P-11 — `suppressHydrationWarning` innecesario (LOW)
- **Archivo:** `app/admin/login/page.tsx`
- **Problema:** 2 `<div>` con `suppressHydrationWarning` probablemente innecesarios.

---

## Resumen

| ID | Hallazgo | Severidad | Tipo |
|---|---|---|---|
| P-01 | Zod monolingüe español | HIGH | i18n |
| P-02 | Overlines hardcodeados | LOW | i18n |
| P-03 | DictionaryProvider alta superficie | MED | arquitectura |
| P-04 | Doble fuente de verdad catálogo | MED | arquitectura |
| P-05 | SEC-07 — Admin sin validar ADMIN_EMAIL | HIGH | seguridad |
| P-06 | OrderAssistant /en/ español | HIGH | i18n |
| P-07 | OrderAssistant catálogo paralelo | HIGH | arquitectura |
| P-08 | Bloque whatsapp JSON sin uso claro | MED | dead-code |
| P-09 | label="Limón" hardcodeado | LOW | a11y |
| P-10 | whatsappNumber sin validación | LOW | robustness |
| P-11 | suppressHydrationWarning innecesario | LOW | limpieza |

**3 HIGH**, **2 MED**, **6 LOW** — 11 pendientes en total. Progreso general: ~80% de hallazgos resueltos.
