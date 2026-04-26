# Reglas de Auditoría — Mas Cerca Ap
> Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Framer Motion · React Hook Form · Zod
> Versión: 1.0 | Fecha: 2026-04-09
> Propósito: Auditar el código bajo los mismos parámetros en cada revisión.

---

## Escala de Severidad

| Nivel | Código | Descripción |
|-------|--------|-------------|
| Crítico | 🔴 CRIT | Falla de seguridad o bug que rompe funcionalidad en producción |
| Alto | 🟠 HIGH | Bug grave o deuda técnica con impacto directo en el usuario |
| Medio | 🟡 MED | Mala práctica, código frágil o inconsistencia arquitectural |
| Bajo | 🟢 LOW | Mejora de calidad, limpieza o convención no seguida |
| Info | ℹ️ INFO | Observación sin impacto inmediato, documentar para el futuro |

---

## Categorías de Auditoría

### CAT-1 — Seguridad
Reglas derivadas de OWASP Top 10 adaptadas al stack.

| ID | Regla |
|----|-------|
| SEC-01 | Nunca loguear PII (nombre, email, teléfono) en `console.log` en producción |
| SEC-02 | Toda API route debe validar el body con Zod o equivalente antes de procesarlo |
| SEC-03 | Las API routes públicas deben tener rate limiting o al menos documentar su ausencia |
| SEC-04 | Variables de entorno sensibles (`RESEND_API_KEY`) nunca deben exponerse al cliente (sin prefijo `NEXT_PUBLIC_`) |
| SEC-05 | Links externos (`target="_blank"`) deben incluir `rel="noopener noreferrer"` |
| SEC-06 | Datos de usuario nunca deben interpolarse directamente en HTML sin sanitización |
| SEC-07 | El WhatsApp number y otros datos de contacto expuestos en cliente deben manejarse como variables de entorno |
| SEC-08 | iframes externos deben tener `sandbox` o al menos `referrerPolicy` correcto |

---

### CAT-2 — Bugs y Correctitud
Reglas de comportamiento correcto en runtime.

| ID | Regla |
|----|-------|
| BUG-01 | Todo `setInterval` / `setTimeout` creado en un componente debe limpiarse en el cleanup de `useEffect` |
| BUG-02 | `setTimeout` IDs deben almacenarse en ref o variable para poder cancelarse (`clearTimeout`) |
| BUG-03 | Estados que se computan en el servidor y en el cliente deben ser idénticos en el primer render (evitar hydration mismatch) |
| BUG-04 | Valores computados dependientes de `Date.now()` dentro de componentes deben estar en `useEffect` o `useMemo`, no en el cuerpo del componente |
| BUG-05 | Los arrays de dependencias de `useEffect` deben incluir todas las variables usadas dentro del efecto |
| BUG-06 | Un `catch` vacío o que solo hace `console.error` debe retornar un estado de error al usuario |
| BUG-07 | Textos de contenido deben estar en el idioma correcto (español) sin mezcla accidental de inglés |
| BUG-08 | Datos mock no deben contener errores tipográficos ni whitespace accidental en strings |

---

### CAT-3 — Next.js 14 App Router — Mejores Prácticas

| ID | Regla |
|----|-------|
| NEXT-01 | Un componente solo debe ser `"use client"` si usa hooks, eventos del browser o APIs exclusivas del cliente |
| NEXT-02 | El layout raíz (`app/layout.tsx`) es el único lugar para componentes compartidos (Navbar, Footer) |
| NEXT-03 | `next/image` debe usarse para todas las imágenes; jamás `<img>` nativo |
| NEXT-04 | Imágenes above-the-fold deben tener `priority={true}` |
| NEXT-05 | Imágenes en grids deben declarar `sizes` apropiado para evitar over-fetching |
| NEXT-06 | `sitemap.ts` no debe usar `new Date()` en `lastModified` — genera fechas no deterministas en cada build |
| NEXT-07 | `robots.txt` debe existir en `/public/` |
| NEXT-08 | JSON-LD (Organization schema) debe estar en `layout.tsx` para SEO |
| NEXT-09 | Las API routes deben retornar códigos HTTP correctos (200, 400, 500) |
| NEXT-10 | Variables de entorno `NEXT_PUBLIC_*` se exponen al bundle del cliente — usar solo para datos no sensibles |

---

### CAT-4 — TypeScript

| ID | Regla |
|----|-------|
| TS-01 | Prohibido el uso de `any` explícito o implícito |
| TS-02 | Los tipos compartidos deben definirse una sola vez en `types/index.ts`; no duplicar en componentes |
| TS-03 | Los union types numéricos deben ser estrictos cuando el rango es conocido (ej: `rating: 1|2|3|4|5`) |
| TS-04 | Props opcionales que nunca se pasan desde ningún padre deben eliminarse del interface |
| TS-05 | `z.infer<typeof schema>` debe reusar el tipo de `types/index.ts` si ya existe equivalente |

---

### CAT-5 — Rendimiento

| ID | Regla |
|----|-------|
| PERF-01 | Componentes con solo animaciones Framer Motion de `whileInView` pueden ser Client Components mínimos — aceptable pero documentar |
| PERF-02 | Valores computados costosos o basados en fecha dentro de componentes deben estar en `useMemo` |
| PERF-03 | Imágenes del hero deben tener `priority={true}` y `sizes` correctos |
| PERF-04 | Los carruseles con autoplay deben detener el intervalo cuando el componente está fuera del viewport (IntersectionObserver) — deseable, no bloqueante |
| PERF-05 | No crear objetos/arrays nuevos en cada render sin `useMemo` si se pasan como props |

---

### CAT-6 — Accesibilidad (a11y)

| ID | Regla |
|----|-------|
| A11Y-01 | Todos los botones sin texto visible deben tener `aria-label` |
| A11Y-02 | Imágenes deben tener `alt` descriptivo (no vacío ni genérico como "imagen") |
| A11Y-03 | Elementos interactivos no deben ser divs — usar `<button>` o `<a>` con rol correcto |
| A11Y-04 | El contraste de colores debe cumplir WCAG AA (ratio mínimo 4.5:1 para texto normal) |
| A11Y-05 | iframes deben tener atributo `title` |
| A11Y-06 | Formularios deben tener `label` asociado a cada input (via `for`/`htmlFor` o `aria-label`) |

---

### CAT-7 — Calidad de Código y Deuda Técnica

| ID | Regla |
|----|-------|
| DT-01 | Código comentado (TODO, placeholders) debe estar documentado con ticket o fecha estimada |
| DT-02 | Componentes wrapper que solo hacen pass-through sin lógica deben eliminarse |
| DT-03 | Datos hardcodeados de contacto (teléfonos, emails) deben venir de variables de entorno o de un archivo de config centralizado |
| DT-04 | Links con `href="#"` son placeholders inaceptables en código que va a producción sin documentar |
| DT-05 | Un mismo número de teléfono/WhatsApp no debe definirse en múltiples archivos |
| DT-06 | Props declaradas en un interface que no se usan en ningún componente padre deben eliminarse |

---

### CAT-8 — UX y Contenido

| ID | Regla |
|----|-------|
| UX-01 | Estados de toast/error deben tener timeout de auto-cierre (no quedarse visibles indefinidamente) |
| UX-02 | CTAs en carruseles deben redirigir a la URL correcta según el contenido del slide |
| UX-03 | El countdown timer no debe mostrar `00:00:00` durante el hydration (flash de ceros) |
| UX-04 | Textos en producción no deben contener errores ortográficos ni palabras en idioma incorrecto |

---

## Proceso de Auditoría

1. **Leer** todos los archivos del proyecto (excluyendo `node_modules`)
2. **Aplicar** cada regla de las 8 categorías contra el código
3. **Registrar** cada hallazgo con: ID de regla · Archivo · Línea · Descripción · Severidad · Solución propuesta
4. **Priorizar** correcciones: CRIT → HIGH → MED → LOW
5. **Documentar** el informe en `/home/server/Escritorio/mascercaap/Informe_Auditoria_[fecha].md`

---

## Exclusiones

- `node_modules/` — no auditado
- `public/` — solo verificar existencia de `robots.txt`
- `.env.local` — no auditado por seguridad (solo `.env.local.example`)
- `eslint.config.mjs` — no auditado (configuración de herramienta)

---

*Documento vivo — actualizar cuando cambie el stack o se agreguen nuevas categorías de riesgo.*
