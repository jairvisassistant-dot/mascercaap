# Trazabilidad TDD — Mas Cerca AP

Documento operativo de continuidad. Registra todos los tests creados, su estado y resultado.
Leer al iniciar una sesión nueva para recuperar contexto sin depender del historial conversacional.

**Runner:** `npm run test` (Vitest)  
**Watch:** `npm run test:watch`

---

## Sesión 1 — Feature A: Calculadora de Rendimiento

**Fecha:** 2026-05-03  
**Branch:** `feat/yield-calculator`

### Tests creados

| Archivo | Suite | Test | Estado |
|---|---|---|---|
| `lib/yield-calculator.test.ts` | `cupsPerPack` | 120g yields 2 cups | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `cupsPerPack` | 300g yields 5 cups | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `cupsPerPack` | 1000g yields 18 cups | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `packsNeeded` | 50 cups / 1000g → 3 packs | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `packsNeeded` | 18 cups / 1000g → 1 pack (exacto) | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `packsNeeded` | 19 cups / 1000g → 2 packs | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `packsNeeded` | 10 cups / 120g → 5 packs | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `packsNeeded` | 25 cups / 300g → 5 packs | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `freshComparison (maracuyá)` | 3×1000g → freshKg:12, min:720 | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `freshComparison (maracuyá)` | 1×300g → freshKg:1.2, min:72 | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `freshComparison (mora)` | 2×1000g → freshKg:5.6, min:140 | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `freshComparison (mango)` | 1×1000g → freshKg:2, min:40 | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `buildWhatsappMessage` | retorna URL wa.me con parámetros | ✅ GREEN |
| `lib/yield-calculator.test.ts` | `buildWhatsappMessage` | mensaje contiene todos los campos | ✅ GREEN |

**Total Sesión 1:** 14 tests — 14 GREEN — 0 FAIL

### Archivos creados esta sesión

| Archivo | Tipo | Descripción |
|---|---|---|
| `lib/yield-calculator.ts` | Lógica pura | Motor de cálculo: cupsPerPack, packsNeeded, freshComparison, buildWhatsappMessage |
| `lib/yield-calculator.test.ts` | Tests | 14 tests unitarios — motor de cálculo |
| `components/ui/ChipSelector.tsx` | Componente UI | Chips genéricos reutilizables (Feature A + B) |
| `components/sections/YieldCalculator.tsx` | Componente sección | Calculadora 3 pasos + resultado con comparación fruta fresca |
| `vitest.config.ts` | Config | Vitest con path alias @/ y plugin React |
| `messages/es.json` | i18n | Sección `yieldCalculator` agregada |
| `messages/en.json` | i18n | Sección `yieldCalculator` agregada |

---

## Pendiente — Sesión 2

- [ ] Integrar `YieldCalculator` en home (`app/[lang]/page.tsx`) entre `FeaturedProducts` y `WhyChooseUs`
- [ ] Verificar mobile: touch targets ≥ 44px, scroll, resultado legible
- [ ] Ejecutar `npm run test` → confirmar GREEN
- [ ] Crear PR: `feat/yield-calculator` → `main`
