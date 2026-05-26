# Template-First Mode

Usa este modo cuando el objetivo sea consistencia alta y baja iteracion.

## Por que existe

Los generadores de imagen suelen fallar justo en los detalles que mas importan en catalogo:

- giro leve consistente;
- limpieza del sellado superior;
- control fino del plastico residual;
- igualdad cromatica entre pouch y fruta partida;
- silueta repetible entre gramajes.

Si esas fallas aparecen tras una generacion principal y un fallback blanco, seguir insistiendo por prompt suele gastar tiempo sin volver el proceso estable.

## Lo que necesito del usuario para que funcione bien

Comparte una de estas opciones:

1. Un master aprobado por gramaje:
   - `120g`
   - `300g`
   - `1000g`

2. O, mejor aun, un pouch master limpio por gramaje:
   - mismo tipo de pouch final;
   - giro correcto;
   - sellado superior ya aprobado;
   - fondo transparente real o blanco puro;
   - sin fruta, o con fruta minima si esa composicion tambien sera fija.

## Que hace el modo plantilla

- Usa el master como fuente de verdad para:
  - angulo;
  - proporcion;
  - sellos;
  - limpieza visual;
  - layout base.

- Usa la referencia del sabor para:
  - color de pulpa;
  - fruta de soporte;
  - textura de la fruta partida;
  - texto del sabor.

## Cuando activarlo

Activalo si pasa cualquiera:

- la bolsa queda demasiado frontal;
- el plastico residual del sellado superior sigue apareciendo;
- el color del pouch y la fruta partida se separan de la referencia;
- una misma presentacion exige mas de dos iteraciones creativas.

## Resultado esperado

Con `template-first mode`, la generacion deja de depender de que el modelo "re-invente" bien el pouch en cada corrida.
La parte variable pasa a ser el sabor, no la estructura.
