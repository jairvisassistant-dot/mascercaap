# Safe Refactor TDD - 2026-05-03 14:44 -0500

## Metadatos

- **Tipo:** Ejecucion piloto de `safe-refactor-tdd`
- **Baseline / Snapshot:** HEAD actual + working tree modificado
- **Fuente del baseline:** auditorias previas y snapshot logico actual; no se encontro `baseline_info.txt` formal en la lectura inicial
- **Modo de comparacion:** repo actual completo + working tree actual + auditorias previas como contexto
- **Artefactos previos leidos:** `LECCIONES_APRENDIDAS.md`, `.agents/skills/shared-audit-baseline-traceability.md`, `.agents/skills/safe-refactor-tdd/SKILL.md`, `audit_code_20260429_1654.md`, `audit_architecture_20260427_0718.md`, `verification_20260429_2218.md`, `package.json`
- **Modulo piloto:** flujo de contacto (`lib/schemas/contact.ts`, `app/api/contact/route.ts`, `components/sections/ContactForm.tsx`)
- **Working tree al iniciar:** modificado, con cambios/untracked no relacionados existentes
- **Objetivo del piloto:** validar si el flujo de la nueva Skill es operativo antes de escribir tests o refactorizar

## Observacion Operativa

- El loader de Skills no reconocio `safe-refactor-tdd` aunque el archivo existe en `.agents/skills/safe-refactor-tdd/SKILL.md` y esta registrado en `AGENTS.md`.
- La ejecucion piloto se hizo leyendo el `SKILL.md` directamente desde disco.
- Esto debe quedar documentado en la Skill como modo de contingencia, porque una Skill nueva puede no estar disponible para el loader en la misma sesion en que se crea.

## Estado De Tooling

| Area | Estado |
|---|---|
| Tests existentes | No se detectaron `*.test.*` ni `*.spec.*` |
| Runner unit/integration | No existe `vitest.config.*`, `jest.config.*` ni script `test` |
| Runner E2E | No existe `playwright.config.*`, `cypress.config.*` ni script `test:e2e` |
| Script disponible | `npm run lint` |
| Build | No ejecutar por regla del proyecto |

Conclusion: la Skill no debe escribir tests directamente todavia sin introducir primero una decision de tooling. Para esta primera ejecucion corresponde generar estrategia y matriz, no instalar dependencias automaticamente.

## Matriz De Riesgo

| Modulo | Prioridad | Criticidad | Complejidad | Impacto usuario | Probabilidad fallo | Dificultad test | Dificultad refactor |
|---|---|---|---|---|---|---|---|
| `lib/schemas/contact.ts` | ALTA | Alta: valida input publico | Media: Zod + i18n factory | Alta: errores visibles y API | Media: ya tuvo hallazgo SEC/I18N | Baja: unitario directo | Baja: cambio local si se mantiene contrato |
| `app/api/contact/route.ts` | ALTA | Alta: endpoint publico, email, rate limit, PII | Alta: env vars, Resend, HTML, rate limit | Alta: contacto comercial | Media-Alta: efectos laterales y ramas por env | Media: requiere mocks de Request/Resend/env | Media: helpers privados hoy dificultan test fino |
| `components/sections/ContactForm.tsx` | ALTA | Alta: formulario principal | Alta: RHF, Zod resolver, fetch, estado, WhatsApp | Alta: conversion y confianza | Media: varias ramas UI | Alta: requiere React Testing Library o E2E | Media-Alta: client component con dependencias UI |

## Estrategia De Pruebas Propuesta

### Unitarias

Primero cubrir `lib/schemas/contact.ts` porque da feedback rapido y protege reglas de negocio actuales.

Casos minimos:

- acepta payload valido con trim;
- rechaza `nombre` menor a 2;
- rechaza `nombre` mayor a 80;
- rechaza email invalido y email mayor a 254;
- rechaza telefono menor a 7 y mayor a 30;
- rechaza caracteres de control en `nombre`, `empresa` y `telefono`;
- rechaza mensaje menor a 10 y mayor a 1200;
- usa mensajes localizados cuando se llama `createContactSchema(msgs)`.

Componentes unitarios puros: no hay candidato ideal sin Testing Library. `ContactForm` no deberia testearse como unitario aislado al principio porque su valor esta en integracion/E2E.

### Integracion

Cubrir `app/api/contact/route.ts` con Request real y dependencias mockeadas.

Casos minimos:

- retorna `400` con body invalido;
- retorna `200` en modo desarrollo sin `RESEND_API_KEY`;
- retorna `503` en produccion sin `RESEND_API_KEY`;
- retorna `500` si falta `RESEND_TO_EMAIL`;
- llama Resend con `replyTo`, `subject` sanitizado y HTML escapado;
- retorna `429` despues del limite por IP;
- no loguea objeto de error completo ni PII.

Riesgo detectado: `checkRateLimit`, `escapeHtml`, `sanitizeSubject` y `buildEmailHtml` son helpers privados dentro de la route. Para testearlos directamente habria que extraerlos. Segun `safe-refactor-tdd`, esa extraccion solo deberia hacerse despues de caracterizar comportamiento via API route.

### End-to-End

Cubrir comportamiento real en navegador cuando exista Playwright.

Casos minimos:

- usuario abre `/es/contacto` y ve labels en espanol colombiano;
- usuario intenta enviar vacio y ve errores de validacion;
- usuario completa formulario valido y recibe estado de exito;
- boton/enlace de WhatsApp aparece con texto encodeado despues del envio exitoso;
- usuario en `/en/contacto` ve errores localizados en ingles;
- API con fallo simulado muestra estado de error sin romper la pagina.

## Ciclo RED/GREEN/REFACTOR

- **RED:** No ejecutado. No hay runner de tests configurado.
- **GREEN:** No ejecutado. No se implemento codigo productivo ni test tooling.
- **REFACTOR:** No ejecutado. La Skill bloqueo correctamente el refactor por ausencia de red de seguridad.

Veredicto: para primera ejecucion, el bloqueo fue correcto. El flujo evito el error clasico de tocar codigo sin cobertura.

## Validaciones Ejecutadas

- `git status --short --branch` - OK, confirma branch `main...origin/main [adelante 8]` y working tree modificado.
- `git log --oneline -5` - OK, confirma commits recientes.
- Busqueda de tests `**/*.{test,spec}.{ts,tsx,js,jsx}` - sin resultados.
- Busqueda de configs `vitest/jest/playwright/cypress` - sin resultados.
- Lectura estatica de modulo contacto - OK.

No se ejecuto `npm run lint` porque no hubo cambios productivos ni tests nuevos. No se ejecuto build por regla del proyecto.

## Resultado Del Piloto

- **Comportamiento protegido:** No. Todavia no hay tests.
- **Refactor aplicado:** No. Correcto: no habia red de seguridad.
- **Riesgos residuales:** ausencia total de tooling de tests; helpers privados en API route dificultan unit tests finos; E2E requiere decision sobre Playwright; el loader no reconoce la Skill nueva en esta sesion.
- **Requiere verificacion post-auditoria:** No todavia, porque no hubo cambio productivo. Si se agrega tooling/tests/refactor, si debe ejecutarse `software-audit-verifier`.

## Huecos Detectados En La Skill

1. Falta un modo explicito de **primera ejecucion / piloto** cuando no existe tooling de tests.
2. Falta documentar que si el loader no reconoce la Skill, se debe leer `SKILL.md` desde disco y reportar la observacion operativa.
3. Falta un **Tooling Readiness Gate** antes de RED/GREEN/REFACTOR.
4. Falta distinguir entre estrategia ideal de cobertura a nivel proyecto y orden real dentro de un modulo sin infraestructura.
5. El template de reporte deberia incluir una seccion de `Estado de Tooling`.

## Ajustes Recomendados A La Skill

- Agregar seccion `Modo Piloto / Sin Tooling`.
- Agregar seccion `Tooling Readiness Gate`.
- Agregar regla: si no hay runner, no escribir tests ni instalar dependencias sin decision explicita; producir matriz, estrategia y plan de adopcion.
- Agregar observacion operativa sobre Skills nuevas no reconocidas por el loader.
- Actualizar el template de reporte con `Estado de Tooling`.

## Proximo Paso Tecnico Sugerido

Si se aprueba avanzar con implementacion real, el primer bloque deberia ser:

1. Instalar/configurar Vitest para unitarias e integracion.
2. Crear pruebas de caracterizacion para `lib/schemas/contact.ts`.
3. Agregar pruebas de integracion para `app/api/contact/route.ts` con mocks de Resend/env.
4. Recien despues evaluar Playwright para E2E de `/es/contacto` y `/en/contacto`.

Esto respeta el principio del proyecto: estabilidad primero, refactor despues.
