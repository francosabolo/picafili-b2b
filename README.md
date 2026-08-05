# PowerB2X — portal mayorista sobre Shopify

Storefront **headless B2B** construido con Shopify Hydrogen. Está pensado como
**plantilla**: apuntar el `.env` a otra tienda de Shopify debería alcanzar para
que el portal funcione.

La instancia viva es la demo de **Picafili** (`picafili.myshopify.com`),
publicada en Oxygen como "Pb2x demo".

> **Antes de escribir código, leé [`AGENTS.md`](./AGENTS.md).** Ahí están las
> convenciones, los invariantes de dominio, los gotchas de la plataforma y la
> deuda conocida. Este README solo te pone a correr el proyecto.

## Qué hace

Un comprador mayorista entra, ve **el precio de su cuenta** (no el público),
arma un pedido y lo envía. Concretamente:

- **Estados de cuenta** con capacidades distintas: invitado, registrado
  pendiente, cliente aprobado y vendedor. Los precios y la posibilidad de pedir
  se habilitan por estado, **y el filtrado corre en el servidor** — un gate que
  corre en el navegador no es un gate.
- **Precios por cantidad** (`quantityPriceBreaks`) y **reglas de cantidad**
  (mínimos y bultos), nativos de Shopify B2B.
- **Presupuesto**: el comprador arma una lista y se emite un **draft order** por
  Admin API, consultable en `/account/quotes`.
- **Compra rápida**: búsqueda por nombre o SKU, filtros y alta a la nota en una
  sola pantalla.
- **Listas de reposición**: guardar un pedido y volver a cargarlo en un click,
  revalidando precios contra el catálogo.
- **Lista de precios en CSV**, generada en el servidor.

## Requisitos

- Node `20.16.0`
- npm (hay `package-lock.json`; no uses yarn ni pnpm)

## Arranque

```bash
npm install
cp .env.example .env   # y completá los valores de abajo
npm run dev
```

### Variables de entorno

Todas son obligatorias salvo donde se aclare:

| Variable                                | Para qué                                                 |
| --------------------------------------- | -------------------------------------------------------- |
| `SESSION_SECRET`                        | firma la cookie de sesión; el worker no arranca sin esto |
| `PUBLIC_STORE_DOMAIN`                   | `tu-tienda.myshopify.com`                                |
| `PUBLIC_STOREFRONT_ID`                  |                                                          |
| `PUBLIC_STOREFRONT_API_TOKEN`           | Storefront API (público)                                 |
| `PRIVATE_STOREFRONT_API_TOKEN`          | Storefront API (servidor)                                |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` | login de cliente                                         |
| `PUBLIC_CUSTOMER_ACCOUNT_API_URL`       | login de cliente                                         |
| `PUBLIC_CHECKOUT_DOMAIN`                |                                                          |
| `SHOP_ID`                               |                                                          |
| `ADMIN_API_ACCESS_TOKEN`                | crea los draft orders del presupuesto                    |
| `PUBLIC_GTM_ID`                         | _opcional_ — sin esto no se carga Google Tag Manager     |

⚠️ **`ADMIN_API_ACCESS_TOKEN` hace falta aunque no toques cotizaciones.** El
cliente de Admin API se instancia en cada request; sin la variable el sitio
entero tira 500 en local, no solo el presupuesto. Poné un placeholder si no
tenés el token real.

⚠️ **`/account/*` necesita un dominio público** (un túnel). La Customer Account
API de Shopify no acepta `localhost`.

## Comandos

| Comando           | Qué hace                                             |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | dev server con codegen en watch                      |
| `npm run build`   | build de producción con codegen                      |
| `npm run preview` | build + preview con mini-oxygen                      |
| `npm run codegen` | regenera los `*.generated.d.ts`                      |
| `npm run verify`  | **el gate**: formato → lint de líneas nuevas → build |
| `npm run lint`    | lint completo (arrastra deuda del fork)              |

**Ninguna tarea se cierra sin `npm run verify` en verde.** El lint del gate solo
mira las líneas que tocaste: el proyecto viene de un fork con ~159 errores
preexistentes y linteando el archivo entero había que pagar toda esa deuda para
cambiar dos líneas.

## Adaptarlo a otra tienda

1. Apuntá el `.env` a la tienda nueva.
2. Ajustá el bloque de configuración arriba de **`app/lib/const.js`**: país,
   moneda, idiomas, pedido mínimo, switcher de demo.
3. Cambiá los tokens de marca arriba de **`app/styles/_app.scss`**.
4. Traducí **`app/i18n/translations/*.json`**.

El nombre, el logo y la descripción de la tienda salen de Shopify; las
categorías de la home son sus colecciones. Si encontrás algo de una tienda
específica hardcodeado en un componente, **es un bug de plantilla**: su lugar es
`app/lib/const.js`. La lista de lo que todavía no cumple esto está en
`AGENTS.md`.

## Deploy

GitHub Actions → Oxygen, con `.github/workflows/oxygen-deployment-1000165300.yml`
(storefront `1000165300`, el que coincide con `.shopify/project.json`). Dispara
en push de **cualquier** branch: cada push genera un preview y `main` queda como
producción. En CI hace falta el secret `OXYGEN_DEPLOYMENT_TOKEN_1000165300`.

## Documentación

- [`AGENTS.md`](./AGENTS.md) — convenciones, invariantes, gotchas y deuda
- [`docs/backlog-b2b.md`](./docs/backlog-b2b.md) — backlog B2B con su estado
- [`docs/demo-script.md`](./docs/demo-script.md) — guion para recorrer la demo
