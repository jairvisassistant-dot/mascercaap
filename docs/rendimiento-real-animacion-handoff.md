# Handoff: Presentacion visual "Rendimiento Real"

## Contexto y objetivo

La seccion `Rendimiento Real` (calculadora) ya tenia animaciones internas en el flujo (pasos, odometros, barras, vasos).

El problema reportado fue otro: **la presentacion base del bloque se ve como un rectangulo muerto antes de interactuar**.

Objetivo de este cambio:

- Hacer que el modulo se perciba "activo" al entrar al viewport.
- Mantener elegancia (sin ruido agresivo).
- No romper ni interferir con la logica/UX interna de la calculadora.

Archivo intervenido:

- `components/sections/YieldCalculator.tsx`

## Idea de diseno implementada

Se aplico una arquitectura en capas visuales externas al contenido de la calculadora:

1. **Activacion por viewport (one-shot)**
   - Cuando la seccion entra al viewport, ocurre un "encendido" inicial (fade + lift + micro-scale).
   - Incluye un barrido luminoso horizontal sobre el contenedor.

2. **Grid tecnico de fondo (loop suave)**
   - Textura de lineas (horizontal/vertical) por debajo de la card.
   - Opacidad y desplazamiento muy lento para evitar efecto "parpadeo".

3. **Breathing glow inferior (loop continuo)**
   - Halo difuso bajo la card con animacion de opacidad/escala.
   - Da sensacion de vida constante sin distraer.

4. **Acento de borde tipo snake premium (loop suave)**
   - Borde animado con `conic-gradient` y mascara para que solo se vea en el perimetro.
   - No invade contenido; actua como acento de actividad.

## Como se implemento tecnicamente

### 1) Deteccion de entrada al viewport

- Se agrego `useInView` desde `framer-motion`.
- Referencia nueva: `visualRef`.
- Estado derivado: `visualInView` con `{ once: true, amount: 0.35 }`.

Patron:

- `visualInView === false`: capas visuales inactivas o en opacidad 0.
- `visualInView === true`: se habilitan loops y animaciones de activacion.

### 2) Envoltorio visual externo

Se creo un wrapper `relative` alrededor de la card de calculadora:

- `div ref={visualRef} className="group relative"`

Dentro del wrapper se montaron capas decorativas con `pointer-events-none` para no bloquear clicks.

### 3) Capas nuevas agregadas

#### a) Glow radial superior

- `m.div` absoluto con `radial-gradient` + `blur`.
- Loop en `opacity` y `scale`.

#### b) Grid tecnico

- `m.div` absoluto con doble `linear-gradient` para lineas.
- Loop de `opacity` + `backgroundPosition` (desplazamiento lento).

#### c) Breathing glow inferior

- `m.div` absoluto bajo la card (`-bottom-*`, `blur-3xl`).
- Loop de `opacity` + `scale` con ciclo lento.

#### d) Borde activo + snake

- Borde base con `border-primary/30`.
- Capa `m.div` con `conic-gradient` + mascara (`WebkitMask`/`maskComposite`) para dibujar solo el borde.
- Loop de opacidad para dar pulso de actividad.

#### e) Barrido de activacion por viewport

- Capa con gradiente vertical estrecho que cruza de izquierda a derecha.
- Se dispara al entrar al viewport (`whileInView`, `once: true`).

## Restricciones respetadas

- No se cambio la logica de pasos/resultados de la calculadora.
- No se tocaron handlers ni formulas (`packsNeeded`, `freshComparison`, etc.).
- Todas las capas visuales son decorativas (`pointer-events-none`).
- Se animaron propiedades GPU-friendly (`opacity`, `transform`).

## Posibles motivos de "no se ve / no funciona" para revisar

1. **Soporte de `maskComposite` / `WebkitMaskComposite`**
   - El borde conico puede no renderizar igual en todos los navegadores.
   - Revisar comportamiento en Chrome, Safari, Firefox.

2. **Variables de color de tema**
   - Si `--primary` o tonos asociados son muy apagados en runtime, el efecto se diluye.

3. **Solapamiento visual por z-index/contexto**
   - Otras capas del layout pueden estar tapando decoraciones externas.

4. **Contraste de pantalla y brillo**
   - En monitores con bajo contraste, opacidades suaves pueden perderse.

5. **Viewport trigger no alcanzado como se espera**
   - Con `amount: 0.35`, si la card entra parcialmente o muy rapido, la percepcion del "encendido" puede pasar desapercibida.

6. **Reduccion de movimiento del sistema (si se aplica globalmente)**
   - Verificar si hay politicas CSS/JS globales que reduzcan animaciones.

## Checklist para el agente revisor

1. Verificar visualmente en desktop y mobile que la interaccion no se rompa.
2. Confirmar que el borde conico se pinte correctamente en Chrome/Safari/Firefox.
3. Inspeccionar capas absolutas y stacking context en DevTools.
4. Medir si las animaciones se perciben sin afectar legibilidad del contenido.
5. Validar si conviene reemplazar el borde con mascara por una tecnica mas compatible (fallback CSS).

## Recomendacion si hay que corregir rapido

Si el "snake border" falla por compatibilidad, mantener:

- grid tecnico + breathing glow + sweep de activacion,

y reemplazar el borde conico por:

- `outline`/`box-shadow` animado muy sutil,
- o pseudo-elemento con gradiente lineal rotando sin mascara compleja.

Eso conserva el objetivo visual con menos riesgo cross-browser.
