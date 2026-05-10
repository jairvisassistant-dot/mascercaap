# Guia Operativa de Skills del Proyecto

Este documento explica como funcionan las Skills actuales del proyecto Mas Cerca AP, cuando deben ejecutarse por separado y cuando conviene usarlas en una secuencia coordinada.

La idea central es simple: cada Skill tiene un rol especifico. Si las mezclamos sin orden, generamos ruido. Si las articulamos bien, tenemos un flujo profesional de auditoria, estabilizacion, refactorizacion segura y verificacion.

## Skills Disponibles

| Skill | Rol principal | Modifica codigo | Produce reporte |
|---|---|---:|---:|
| `software-code-auditor` | Auditar codigo linea por linea: bugs, seguridad, i18n, deuda tecnica y calidad | No | Si |
| `software-architecture-auditor` | Auditar arquitectura, performance, rendering, bundle, stack y estructura | No | Si |
| `safe-refactor-tdd` | Crear red de seguridad con tests y permitir refactors controlados | Si, si el usuario lo pide o la tarea lo requiere | Si, cuando el cambio es significativo |
| `software-audit-verifier` | Verificar cambios post-auditoria contra baseline, respuesta y estado real del repo | No | Si |
| `pulpa-image-generation` | Generar o auditar imagenes premium uniformes para pulpas | Si, sobre assets/contenido visual | Segun tarea |

## Contrato Compartido

Las Skills de auditoria y refactorizacion segura deben respetar el contrato comun:

```text
.agents/skills/shared-audit-baseline-traceability.md
```

Este contrato define:

- contexto primero;
- baseline explicito;
- delta real;
- working tree como parte de la realidad;
- cero commits automaticos;
- reportes con trazabilidad;
- lectura de documentacion local/versionada de Next.js cuando aplique.

Regla critica: si existe historial en `Otros/Info_Auditorias/` y no se leyo, la conclusion queda incompleta.

## Orden Recomendado Completo

Este es el flujo ideal cuando el objetivo es estabilizar el proyecto antes de produccion o intervenir zonas sensibles.

### 1. Auditoria de Arquitectura

Skill:

```text
software-architecture-auditor
```

Objetivo:

- entender riesgos estructurales;
- evaluar rendering, Server/Client Components, performance, bundle, data fetching, i18n y SEO;
- detectar decisiones tecnicas que pueden condicionar los refactors.

Salida esperada:

```text
Otros/Info_Auditorias/audit_architecture_YYYYMMDD_HHMM.md
```

Usar cuando:

- hay dudas sobre arquitectura;
- se quiere roadmap tecnico;
- se van a tocar rutas, layouts, data fetching, cache, i18n, bundle o performance;
- se necesita decidir que areas conviene estabilizar primero.

### 2. Auditoria de Codigo

Skill:

```text
software-code-auditor
```

Objetivo:

- encontrar bugs reales, vulnerabilidades, deuda tecnica, i18n roto, accesibilidad, errores de TypeScript y codigo muerto;
- generar hallazgos accionables con severidad y evidencia.

Salida esperada:

```text
Otros/Info_Auditorias/audit_code_YYYYMMDD_HHMM.md
```

Usar cuando:

- se necesita revisar calidad concreta de codigo;
- se sospechan bugs o vulnerabilidades;
- se quiere priorizar fixes antes de refactorizar;
- se requiere evidencia archivo:linea.

### 3. Red de Seguridad y Refactor Seguro

Skill:

```text
safe-refactor-tdd
```

Objetivo:

- tomar hallazgos o riesgos como entrada;
- elegir un modulo chico;
- crear pruebas de caracterizacion;
- proteger comportamiento actual;
- aplicar RED/GREEN/REFACTOR;
- refactorizar solo si hay cobertura suficiente.

Salida esperada cuando el cambio es significativo:

```text
Otros/Info_Auditorias/safe_refactor_tdd_YYYYMMDD_HHMM.md
```

Capas de prueba que debe considerar:

- pruebas unitarias para funciones, validadores, schemas, helpers, sanitizacion, hooks simples y componentes con ramas relevantes;
- pruebas de integracion para flujos internos entre componentes, hooks, APIs, schemas, servicios, estados, CMS o DB mockeada;
- pruebas end-to-end para validar lo que el usuario hace en el navegador: navegacion, formularios, envio de datos y flujos criticos.

Regla critica:

```text
No se refactoriza sin red de seguridad previa.
```

### 4. Verificacion Post-Cambio

Skill:

```text
software-audit-verifier
```

Objetivo:

- comparar auditorias previas, respuesta del desarrollador, commits, working tree y estado actual;
- decidir si cada hallazgo quedo resuelto, persistente, parcial o si genero regresion;
- detectar issues nuevos introducidos por el fix o refactor.

Salida esperada:

```text
Otros/Info_Auditorias/verification_YYYYMMDD_HHMM.md
```

Usar cuando:

- se aplicaron fixes derivados de auditorias;
- se termino un refactor seguro;
- se quiere validar que no hubo regresiones;
- se necesita cerrar trazabilidad antes de seguir con otro modulo.

## Flujo Completo Recomendado

```text
software-architecture-auditor
        |
        v
software-code-auditor
        |
        v
safe-refactor-tdd
        |
        v
software-audit-verifier
```

Este flujo es el mas robusto para trabajo serio de estabilizacion.

Usarlo cuando:

- el proyecto esta cerca de produccion;
- hay riesgo alto de romper comportamiento;
- se van a tocar APIs, formularios, navegacion, i18n, data fetching, seguridad o persistencia;
- se necesita trazabilidad profesional.

## Ejecucion Por Separado

Las Skills tambien pueden funcionar de forma independiente. No siempre hace falta correr toda la cadena.

### Solo `software-architecture-auditor`

Sirve si la pregunta es estrategica:

- revisar performance;
- evaluar stack;
- analizar bundle;
- decidir roadmap;
- revisar rendering o data fetching.

No hace falta ejecutar codigo auditor ni TDD si solo se necesita diagnostico arquitectural.

### Solo `software-code-auditor`

Sirve si la pregunta es puntual de codigo:

- buscar bugs;
- revisar seguridad;
- detectar deuda tecnica;
- revisar i18n o accesibilidad;
- revisar un modulo especifico.

No hace falta arquitectura si el scope es chico y no toca decisiones estructurales.

### Solo `safe-refactor-tdd`

Sirve si ya sabemos que modulo vamos a intervenir.

Ejemplos:

- cubrir `contactSchema` con tests;
- refactorizar una funcion con comportamiento conocido;
- agregar pruebas de caracterizacion a una API route;
- estabilizar un formulario antes de tocarlo.

Aunque se ejecute sola, debe leer contexto y baseline. Si encuentra riesgos grandes, debe recomendar auditoria previa.

### Solo `software-audit-verifier`

Sirve si ya existen auditorias y cambios posteriores.

Ejemplos:

- validar si se aplicaron fixes;
- comprobar si una respuesta del desarrollador se sostiene;
- revisar si un refactor metio regresiones;
- cerrar una ronda de auditoria.

No debe convertirse en auditoria full nueva.

### Solo `pulpa-image-generation`

Sirve para tareas visuales del catalogo de pulpas:

- generar imagenes de producto;
- normalizar presentaciones 120g, 300g o 1000g;
- auditar uniformidad visual;
- crear prompts de imagen premium.

No forma parte del flujo TDD/codigo salvo que el cambio visual afecte componentes o assets usados por la app.

## Decision Rapida

| Necesidad | Skill |
|---|---|
| Quiero saber si la arquitectura esta bien | `software-architecture-auditor` |
| Quiero encontrar bugs, deuda o problemas de seguridad | `software-code-auditor` |
| Quiero tocar codigo sin romper comportamiento | `safe-refactor-tdd` |
| Quiero validar fixes ya aplicados | `software-audit-verifier` |
| Quiero imagenes premium uniformes de pulpas | `pulpa-image-generation` |

## Orden Para TDD y Refactorizacion Segura

Cuando el objetivo sea implementar TDD incremental en este proyecto, el orden correcto es:

### Paso 1 - Diagnosticar riesgo

Usar auditorias existentes o correr auditoria minima.

Resultado esperado:

- modulo candidato;
- riesgo principal;
- comportamiento que debe protegerse;
- pruebas necesarias.

### Paso 2 - Crear red de seguridad

Usar `safe-refactor-tdd`.

Primero pruebas de caracterizacion:

- E2E para flujos de usuario criticos;
- integracion para interaccion entre capas;
- unitarias para logica deterministica.

### Paso 3 - Aplicar RED/GREEN/REFACTOR

Orden obligatorio:

```text
RED -> GREEN -> REFACTOR
```

No se saltea RED. No se refactoriza durante GREEN. No se cambia comportamiento durante REFACTOR.

### Paso 4 - Verificar delta

Usar `software-audit-verifier`.

Confirmar:

- resuelto;
- persistente;
- parcial;
- regresion;
- nuevo issue.

## Ejemplo Practico

Supongamos que queremos estabilizar el formulario de contacto.

Orden recomendado:

1. `software-code-auditor` sobre `components/sections/ContactForm.tsx`, `lib/schemas/contact.ts` y `app/api/contact/route.ts`.
2. `safe-refactor-tdd` para crear pruebas de caracterizacion:
   - unitarias para `contactSchema`, sanitizacion y validaciones;
   - integracion para API route + schema + Resend mockeado;
   - E2E para completar y enviar el formulario desde navegador.
3. Refactor minimo si la cobertura protege comportamiento.
4. `software-audit-verifier` para confirmar que no se rompieron validaciones, errores, i18n ni seguridad.

## Reglas De Oro

- Auditoria no modifica codigo.
- Verificacion no modifica codigo.
- Refactor seguro solo modifica codigo despues de pruebas.
- TDD en proyecto existente empieza con characterization tests, no con reescritura.
- E2E valida usuario real; integracion valida colaboracion interna; unitarias validan logica chica y deterministica.
- Si una prueba falla, no se avanza al siguiente modulo.
- Si un cambio toca convenciones de Next.js, leer `node_modules/next/dist/docs/` antes de afirmar que esta bien.
- No correr build despues de cambios, por regla del proyecto.
- No hacer commits automaticos.

## Mapa Mental Final

```text
Diagnosticar -> Proteger -> Cambiar -> Verificar

Diagnosticar:
  software-architecture-auditor
  software-code-auditor

Proteger y cambiar:
  safe-refactor-tdd

Verificar:
  software-audit-verifier

Visual catalogo pulpas:
  pulpa-image-generation
```

Si la tarea es pequena, se puede usar una Skill aislada. Si la tarea toca comportamiento critico, usar la secuencia completa. Es asi de facil: cuanto mayor el riesgo, mas completa debe ser la cadena.
