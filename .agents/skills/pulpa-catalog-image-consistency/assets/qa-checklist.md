# QA Checklist Orquestado

Usa este checklist como matriz de gates. Cada gate produce un resultado que alimenta el siguiente. No repitas un gate que ya tiene PASS dentro de la misma corrida, salvo que el archivo, prompt, proveedor o normalizacion haya cambiado.
Si una salida ya es visualmente util y el problema restante es canvas/alpha/fondo blanco permitido, corrige por normalizacion y evita una iteracion creativa extra.

## Regla de aprobacion

- Cada gate debe terminar en `PASS` o `FAIL`.
- Si cualquier gate queda en `FAIL`, la presentacion no puede aprobarse.
- Las mediciones tecnicas no sustituyen la auditoria visual.
- La auditoria visual no sustituye la auditoria tecnica.

## Gate 0: Referencia Obligatoria

- [ ] Existe imagen de referencia del sabor.
- [ ] Se identifica presentacion base (`120g`, `300g` o `1000g`).
- [ ] Se identifica sabor objetivo.

Si falta cualquiera: detener flujo y pedir solo el dato faltante.

## Gate 1: Preflight De Corrida

- [ ] Recursos obligatorios cargados.
- [ ] Proveedor declarado: `gpt-image-2`, salvo instruccion explicita contraria.
- [ ] Canvas final declarado desde `presentation-specs.json`: `1000x1000`.
- [ ] Canvas de generacion declarado desde `presentation-specs.json`: `1024x1024` para `gpt-image-2` cuando se usa medida explicita.
- [ ] Referencia FRESA seleccionada por cada presentacion objetivo.
- [ ] Archivos existentes del sabor marcados como `candidato-no-aprobado`.
- [ ] Set de presentaciones objetivo definido sin depender de existencia en disco.

## Gate 2: Auditoria De Referencia

- [ ] Pouch vertical tipo flat frozen sachet, no doypack ni zipper.
- [ ] Etiqueta integrada, no flotante.
- [ ] Texto permitido solamente: `Pulpa de Fruta Natural` y nombre del sabor.
- [ ] Sin texto de gramaje ni claims extra.
- [ ] Color de pulpa usable como referencia de sabor.
- [ ] Consistencia y textura de pulpa usable como referencia.
- [ ] Nivel de detalle usable como referencia: semillas, brillo, textura y acabado no se leen como un render mas lujoso que el producto real.
- [ ] Frutas de soporte claramente identificables.
- [ ] Giro correcto: el costado derecho se ve un poco mas que el izquierdo.
- [ ] Sellados finos, limpios y premium.
- [ ] Sellado superior sin halo ancho ni doble capa plastica dominante.
- [ ] Sellado superior con reduccion agresiva del residuo plastico visible; no queda corona blanca gruesa, flap amplio ni sobrante llamativo.
- [ ] El color de la pulpa del pouch y la fruta partida pertenece a la misma familia cromatica definida por la referencia del sabor.
- [ ] Comparacion contra FRESA del mismo gramaje completada.

Resultado unico: `reference_audit = PASS` o `reference_audit = FAIL`.

## Gate 3: Decision De Generacion

- [ ] Si `reference_audit = PASS`, se planifican las dos presentaciones distintas a la referencia.
- [ ] Si `reference_audit = FAIL`, se planifica regenerar/corregir referencia y luego generar las tres.
- [ ] Ninguna presentacion se omite porque el archivo ya exista.
- [ ] Cualquier archivo existente que se quiera reutilizar queda sujeto a QA completo actual.

## Gate 4: Prompt Plan

- [ ] Prompt base incluido.
- [ ] Bloque obligatorio de salida incluido.
- [ ] Regla de angulo incluida.
- [ ] Bloque de presentacion correcto incluido.
- [ ] Negative prompt comun incluido.
- [ ] Bloque de identidad del sabor derivado de la referencia incluido.
- [ ] Fruta partida descrita con realismo: color natural, semillas, humedad, textura y variacion organica.
- [ ] Prompt obliga a mantener el mismo nivel de simplicidad o detalle de la referencia, sin sobrerenderizar el producto.
- [ ] Prompt no pide anuncio, poster, escena, mockup o texto fuera de etiqueta.

## Gate 5: Generacion

- [ ] Imagen generada con `gpt-image-2`, salvo instruccion explicita contraria.
- [ ] No se creo mediante resize, crop, paste, upscale o composicion local.
- [ ] Asset aislado, no anuncio ni layout.
- [ ] Salida cruda esperada en canvas valido de proveedor (`1024x1024` para `gpt-image-2`) o salida nativa que pueda normalizarse.
- [ ] Salida final esperada `1000x1000`.
- [ ] Fondo transparente solicitado.
- [ ] Si no hay transparencia nativa, fallback solicitado solo sobre blanco puro.
- [ ] No se uso fondo chroma verde/magenta/azul.
- [ ] No se excedio el maximo operativo de dos iteraciones creativas por presentacion sin razon justificada.

## Gate 6: Auditoria Tecnica

Ejecutar `scripts/audit_catalog_asset.py` cuando exista archivo local.

- [ ] Canvas final `1000x1000`.
- [ ] Alpha real presente.
- [ ] Fondo transparente limpio.
- [ ] Bounding box total dentro del rango de presentacion.
- [ ] Peso dentro del maximo de presentacion.
- [ ] Extension final `.webp` cuando se audita entrega.
- [ ] Nombre final cumple `pulpa-{sabor}{gramaje}.webp`.

## Gate 7: Auditoria Visual

- [ ] Pouch vertical y tipo correcto.
- [ ] Etiqueta integrada, legible y en perspectiva.
- [ ] Vista no completamente frontal.
- [ ] Giro correcto: costado derecho un poco mas visible.
- [ ] Sellos limpios, refinados y sin plastico residual dominante.
- [ ] Sellado superior sin corona blanca, flap amplio, ni segunda capa plastica visible.
- [ ] Color de pulpa consistente con referencia.
- [ ] El tono del pouch y el tono de la fruta partida siguen la misma familia cromatica de la referencia del sabor, sin deriva a un tono ajeno (ej: mora no debe virar a rojo fresa, maracuya no debe virar a naranja mango).
- [ ] Textura/consistencia de pulpa consistente con referencia.
- [ ] Densidad de semillas, brillo superficial y micro-textura del pouch consistentes con referencia; no se ven exagerados.
- [ ] Frutas del sabor correctas.
- [ ] Fruta partida se ve natural, no plastica ni con color artificial ajeno al sabor.
- [ ] La fruta partida no se ve mas grande, mas brillante o mas dramatizada que en la referencia del sabor.
- [ ] Las frutas cortadas conservan frescura y realismo: interior creible, humedad natural cuando aplique y aspecto de corte reciente.
- [ ] Misma composicion base de frutas entre presentaciones del sabor.
- [ ] Iluminacion y acabado comercial consistentes.
- [ ] Escala visible alineada con FRESA del mismo gramaje.
- [ ] Si se compara con la referencia del sabor, la salida se percibe como la misma familia visual, no como una reinterpretacion mas premium.
- [ ] `300g` y `1000g` comparten altura visible; `1000g` crece sobre todo en ancho.

## Gate 8: Transparencia

 - [ ] Si la herramienta permite un intento realista de transparencia, se hizo como maximo una vez antes de cambiar a fallback blanco.
 - [ ] Si la herramienta integrada devolvio checkerboard, RGB sin alpha o fondo opaco en la primera salida, se paso directo a fallback blanco sin insistir innecesariamente.
 - [ ] Si la primera salida ya fue blanco puro y el producto era valido, se acepto como raw fallback y no se abrio una iteracion creativa adicional.
- [ ] Si hubo fallback blanco, el fondo fue removido antes de normalizar.
- [ ] No se uso ni se aprobo fondo verde, magenta, azul o cualquier chroma key.
- [ ] No hay checkerboard renderizado.
- [ ] No hay blanco opaco ni contaminacion de fondo.

## Gate 9: Normalizacion

Ejecutar `scripts/normalize_catalog_webp.py` solo despues de tener alpha real.
Excepcion: si el candidato es fallback blanco puro, ejecutar `scripts/normalize_catalog_webp.py --remove-white-background`.

- [ ] Se produce canvas final `1000x1000`.
- [ ] Si el candidato crudo fue `1024x1024` u otro canvas valido, se uso `--fit-final-canvas`.
- [ ] Si el candidato era visualmente correcto pero demasiado grande, se intento `--fit-presentation-bbox` antes de regenerar.
- [ ] Se conserva alpha real.
- [ ] Se exporta `WEBP`.
- [ ] Se elimina metadata cuando sea posible.
- [ ] Se comprime bajo el maximo de presentacion sin perdida visual obvia.

## Gate 10: Final QA

- [ ] Todos los gates relevantes estan en `PASS`.
- [ ] Archivo final existe.
- [ ] Archivo final no es candidato ni salida cruda.
- [ ] Reporte de corrida incluye proveedor, canvas, bbox, peso, alpha y decision por presentacion.

## Rechazo Automatico

Rechaza y regenera cuando ocurra cualquiera:

- proveedor distinto a `gpt-image-2` sin instruccion explicita;
- presentacion creada por resize, crop, paste, upscale o composicion local;
- canvas final distinto a `1000x1000`;
- salida cruda en canvas invalido sin normalizacion controlada;
- pouch horizontal o tipo doypack/zipper;
- etiqueta flotante o texto extra;
- escala fuera de rango de su presentacion;
- escala visible distinta al patron FRESA del mismo gramaje;
- `300g` y `1000g` con altura visible inconsistentemente distinta;
- frutas dominando o cambiando layout base;
- fruta partida con color artificial, textura plastica o semillas irreales;
- pouch o garnish con mas dramatismo, mas lujo visual o mas detalle que la referencia del sabor;
- color de pulpa inconsistente con referencia;
- fondo no transparente o contaminado;
- fondo verde, magenta, azul o chroma-key en cualquier candidato;
- patron checkerboard renderizado dentro del fondo;
- giro invertido;
- sellado superior con exceso de plastico residual, flap ancho, corona plastica visible o sobrante llamativo.
- frutas cortadas secas, waxy, plasticas, envejecidas o sin frescura natural.
