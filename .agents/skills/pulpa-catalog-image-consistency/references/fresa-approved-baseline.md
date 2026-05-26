# FRESA Baseline Aprobado (Primera Prueba)

Estas referencias se consideran baseline inicial valido para calibrar proporcion entre presentaciones:

- /home/jilz/Escritorio/mas-cerca-ap/public/imgs/pulpa-fresa120.webp
- /home/jilz/Escritorio/mas-cerca-ap/public/imgs/pulpa-fresa300.webp
- /home/jilz/Escritorio/mas-cerca-ap/public/imgs/pulpa-fresa1000.webp

Uso permitido:

- calibrar tamano relativo 120g/300g/1000g,
- validar layout base de frutas,
- validar estilo de etiqueta y consistencia visual.

Metricas maestras detectadas (todas normalizadas a canvas `1000x1000` con alpha real):

- `120g`:
- canvas `1000x1000` RGBA
- bbox pouch normalizado: `332x774`
- bbox grupo completo: `682x786`
- peso: `60KB`
- `300g`:
- canvas `1000x1000` RGBA
- bbox pouch normalizado: `418x805`
- bbox grupo completo: `783x802`
- peso: `59KB`
- `1000g`:
- canvas `1000x1000` RGBA (limpiado, fondo original degradado gris claro reemplazado por alpha real)
- bbox visible normalizado: `821x809`
- peso: `88KB`
- NOTA: el baseline `1000g` original era RGB sin alpha al limpiarse. La version actual
  tiene alpha real y bounding box dentro del spec. Los bounded boxes de 1000g se derivan
  de la regla `shared-height-family` con 300g:
  `fullGroupHeightPx: [792, 810]` (identico a 300g), `fullGroupWidthPx: [820, 855]` (mas ancho que 300g).

Jerarquia de tamanos aprobada para plantilla:

- `120g`: claramente mas baja que `300g` y `1000g`
- `300g`: mas alta que `120g`
- `1000g`: altura visible practicamente igual a `300g`, con crecimiento principal en ancho

Uso no permitido:

- copiar pixeles para simular otro sabor,
- recolorear FRESA para generar otra fruta.
