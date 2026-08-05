# DESIGN.md — escalas de la plantilla

> Este documento no es una guía de estilo para leer una vez. Las escalas de acá
> las **verifica el gate** (`scripts/check-design-tokens.mjs`) en cada línea de
> SCSS que agregues. Si te bloquea, la respuesta casi siempre es "usá el paso de
> la escala más cercano", no "agregá un valor nuevo".

## Por qué existe

El CSS del proyecto llegó a tener, medido:

|                                                | acumulado          | escala |
| ---------------------------------------------- | ------------------ | ------ |
| tamaños de fuente distintos                    | 51                 | 7      |
| radios distintos                               | 26                 | 4      |
| valores de espaciado distintos                 | 134                | 8      |
| colores hex crudos fuera del archivo de tokens | 47, en 14 archivos | 0      |

Nadie decidió eso. Se acumuló eligiendo un valor a ojo por componente: `13px`
acá, `0.8rem` allá, `7px` de radio porque quedaba bien en esa tarjeta. El
resultado es lo que se percibe como **interfaz frágil** — cosas que _casi_ se
alinean, textos que _casi_ son del mismo tamaño, tarjetas que _casi_ tienen el
mismo redondeo. Ningún elemento está mal solo; el conjunto se ve descuidado.

Una escala corta arregla eso por construcción: si solo hay siete tamaños de
texto, dos textos distintos se ven distintos **a propósito**.

## Tipografía

Razón ~1.2, sin pasos intermedios.

| Token            | Valor                      | Para qué                         |
| ---------------- | -------------------------- | -------------------------------- |
| `--text-xs`      | 0.75rem / 12px             | badges, metadatos, SKU           |
| `--text-sm`      | 0.875rem / 14px            | texto secundario, botones chicos |
| `--text-base`    | 1rem / 16px                | cuerpo                           |
| `--text-lg`      | 1.125rem / 18px            | destacados, totales              |
| `--text-xl`      | 1.5rem / 24px              | títulos de sección               |
| `--text-2xl`     | 2rem / 32px                | títulos de página                |
| `--text-display` | `clamp(2rem, 5vw, 3.5rem)` | heroes                           |

Pesos: **500** cuerpo, **800** títulos y énfasis (`--font-weight-body` /
`--font-weight-bold`). No hay pesos intermedios: Montserrat se carga en 500, 600
y 800, y el 600 es solo para labels en mayúscula.

## Espaciado

Base 4px. **Todo** `padding`, `margin` y `gap` sale de acá.

| Token        | Valor   |
| ------------ | ------- |
| `--space-1`  | 0.25rem |
| `--space-2`  | 0.5rem  |
| `--space-3`  | 0.75rem |
| `--space-4`  | 1rem    |
| `--space-6`  | 1.5rem  |
| `--space-8`  | 2rem    |
| `--space-12` | 3rem    |
| `--space-16` | 4rem    |

Regla práctica: dentro de un componente `--space-1` a `--space-4`; entre
componentes `--space-6` a `--space-8`; entre secciones de página `--space-12` o
`--space-16`.

## Radios

Cuatro, no veintiséis.

| Token           | Valor | Para qué         |
| --------------- | ----- | ---------------- |
| `--radius-sm`   | 10px  | inputs, chips    |
| `--radius-md`   | 18px  | botones          |
| `--radius-lg`   | 20px  | tarjetas, media  |
| `--radius-pill` | 999px | badges de estado |

Los alias legacy (`--border-radius`, `--button-border-radius`,
`--input-border-radius`) siguen valiendo: los usan ~40 archivos y apuntan a los
mismos valores. Cambia el valor, no el contrato.

## Color

Los colores se usan **por rol, nunca por valor**. `--brand-magenta` dice qué es;
`#e72475` no dice nada, y el día que la tienda cambie de marca hay que cazarlo
por 14 archivos.

- **Marca**: `--brand-cream`, `--brand-magenta`, `--brand-teal`,
  `--brand-petrol`, `--brand-orange`, `--brand-amber`
- **Zona B2B**: `--b2b-accent`, `--b2b-surface`, `--b2b-ink`, `--b2b-savings`
- **Semánticos**: `--color-red`, `--color-green`, `--color-yellow`

Un color nuevo se agrega **al bloque de tokens de `_app.scss`**, con un nombre
que diga su rol. Si no se te ocurre el nombre, probablemente no necesitás el
color.

## Lo que el chequeo NO cubre

Sé honesto sobre esto en vez de confiar de más:

- **Proporciones y ritmo vertical.** El chequeo valida que un espaciado sea de
  la escala, no que sea el correcto. `--space-16` entre dos líneas de una
  tarjeta pasa el gate y está mal.
- **Contraste.** Los tokens de marca están elegidos para contraste AA sobre
  crema, pero una combinación nueva hay que verificarla.
- **Responsive.** Que un valor sea de la escala no dice nada de cómo se comporta
  a 390px. Los breakpoints son `$breakpoint-sm: 768px` y `$breakpoint-md: 960px`.
- **La deuda vieja.** El chequeo mira solo líneas nuevas, igual que el lint. Los
  51 tamaños y los 134 espaciados siguen ahí; se pagan por archivo cuando toca
  modificarlo.

## Cuando la escala no alcanza

Hay valores legítimos fuera de escala: el `1px` de un borde, un truco de
accesibilidad, un `-2px` para alinear ópticamente un icono. Para esos casos hay
una válvula de escape explícita:

```scss
.algo {
  margin-top: -2px; /* design-tokens-ignore: alinea el icono con la linea base */
}
```

Se salta esa línea y nada más. Es a propósito que sea fea y que quede en el
diff: si aparece tres veces seguidas en un componente, el problema no es el
chequeo, es que falta un token.

Lo que **no** hay que hacer es sacar el paso del `verify.sh`. Una regla sin
escape termina siempre con alguien apagando la regla entera.

## Cómo correrlo

```bash
npm run check:design   # solo el chequeo de escalas
npm run verify         # el gate completo, que lo incluye
```
