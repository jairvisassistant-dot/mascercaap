# Bug: CSP bloquea `eval()` en modo desarrollo → página en blanco

**Fecha:** 2026-05-13  
**Severidad:** Alta (bloquea el entorno de desarrollo completamente)  
**Commit que introdujo el bug:** `a594049` fix(audit): fase 2 — cookie consent, CSP, i18n schemas, headings, UX  
**Commit del fix:** siguiente commit en rama `develop`

---

## Síntoma

Todas las páginas del sitio cargaban en blanco en `localhost:3000`. La barra de navegación y los fondos de secciones aparecían, pero ningún contenido de texto o imagen era visible. El mismo comportamiento ocurría en todas las rutas (`/es`, `/es/productos`, `/es/nosotros`, etc.).

## Error en consola del browser

```
Uncaught EvalError: call to eval() blocked by CSP
Content-Security-Policy: La configuración de la página bloqueó la ejecución
de JavaScript eval (script-src) porque viola la siguiente directiva:
"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com"
(Falta 'unsafe-eval')
```

## Causa raíz

La auditoría de seguridad (fase 2) agregó un CSP estricto en `next.config.ts` que no incluía `'unsafe-eval'` en la directiva `script-src`:

```js
// ANTES (bug)
"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com"
```

**Next.js en modo desarrollo** usa `eval()` internamente para:
- Source maps inline (webpack `devtool: 'eval-source-map'`)
- Hot Module Replacement (HMR)
- El runtime de compilación de webpack

Cuando el browser bloqueó `eval()`, el bundle de JavaScript del cliente lanzó un `EvalError` silencioso al inicializarse. Esto impidió que React completara la hidratación del árbol de componentes en el cliente.

**Consecuencia en cascada:**
- React no hidrata → no monta componentes cliente
- `framer-motion` no puede animar → todos los `<m.div initial={{ opacity: 0 }}>` quedan invisibles
- El contenido de cada página (texto, imágenes, secciones) es 100% content dentro de contenedores animados con `opacity: 0` inicial
- Resultado visible: fondo de sección visible (CSS puro del servidor), todo lo demás: blanco

## Por qué no falló en CI / producción

En `production` (`NODE_ENV=production`), Next.js **no usa `eval()`**. El bundle de producción usa source maps externos o los desactiva, y webpack usa modos de bundling que no requieren `eval`. Por eso el CSP estricto es correcto para producción.

## Fix aplicado

`next.config.ts` ahora usa `'unsafe-eval'` condicionalmente, solo en desarrollo:

```js
// DESPUÉS (fix)
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com"
  : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com";
```

En producción el CSP queda idéntico al diseñado por la auditoría (sin `'unsafe-eval'`).

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `next.config.ts` | CSP condicional por `NODE_ENV` |

## Lección aprendida

Al agregar cabeceras CSP en el entorno de desarrollo de Next.js, **siempre verificar** que `'unsafe-eval'` esté habilitado en `script-src` para `NODE_ENV=development`. Webpack (usado por Next.js dev server) depende de `eval()` para su pipeline de HMR y source maps.

La regla de oro: **aplicar el CSP estricto a `production`, relax en `development`.**
