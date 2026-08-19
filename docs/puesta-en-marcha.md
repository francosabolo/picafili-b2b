# Puesta en marcha en una tienda nueva

Qué hay que tocar —y en qué orden— para que este portal funcione sobre otra tienda de Shopify y
otro negocio.

**Está escrito como runbook, no como referencia.** Cada paso dice qué hacer, dónde, y sobre todo
**cómo se ve si lo salteás**, porque el modo de falla dominante de este proyecto no es un error:
Shopify contesta `null`, cero resultados o el precio del mercado equivocado, con cara de que todo
está bien. Un metafield que no existe devuelve `null`. Un tag que nadie tiene devuelve cero
productos. Un catálogo sin asignar devuelve precios, solo que no son los de ese comprador.

El manual operativo del día a día es `AGENTS.md`. El documento de decisión de plataforma es
`docs/arquitectura.md`. Esto es la instalación.

---

## 0. La regla que ahorra el 80% del dolor

**`npm run doctor` es el que dice si esto está bien, no la pantalla.** Corrélo después de cada
bloque de abajo. Está hecho exactamente para esto: contrasta lo que el código **declara** contra lo
que la tienda **tiene**, que es la clase de desvío que no se ve navegando.

Necesita red y el `ADMIN_API_ACCESS_TOKEN` real — el del `.env` local suele ser un placeholder, y
en ese caso el doctor **avisa que no pudo comprobar** en vez de callarse. Si ves varios "no se pudo
verificar", el token es lo primero a arreglar: sin él, media instalación queda sin chequear.

---

## 1. Antes de tocar código: ¿la tienda puede hacer esto?

| Verificar                        | Cómo                                                                                                      | Si falta                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| La tienda tiene acceso a B2B     | `shop { plan { displayName shopifyPlus } }` por Admin API                                                 | Sin B2B no hay companies: `REQUIRE_B2B_COMPANY` deja el portal inaccesible para todos |
| Hay al menos una company cargada | `npm run doctor` → "Companies B2B"                                                                        | Nadie pasa del login. **El sitio responde 200 mientras lo hace**                      |
| Asignación de catálogo           | Directo a la location es **Plus**; en Basic/Grow/Advanced el catálogo cuelga del **B2B market** (hasta 3) | Cambia si aprobar es un endpoint o un endpoint + un paso en el admin                  |

⚠️ B2B dejó de ser exclusivo de Plus el 2 de abril de 2026. Lo que sigue siendo Plus es la
asignación **directa de catálogo a company location** y los catálogos ilimitados.

---

## 2. Credenciales

Las variables están listadas en `AGENTS.md` → Operación, pero **no todas salen del mismo lado**, y
esa es la parte que sorprende:

| API                                                | De dónde sale                 | Cómo se obtiene                                            |
| -------------------------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| **Storefront** — catálogo, precios, carrito        | Canal Hydrogen                | `shopify hydrogen env pull`                                |
| **Customer Account** — login, cuenta, cotizaciones | Canal Hydrogen                | idem                                                       |
| **Admin** — draft orders, metafields, companies    | **Custom app, creado a mano** | Configuración → Apps y canales de venta → Desarrollar apps |
| `SESSION_SECRET`                                   | Nuestro                       | Cualquier string aleatoria larga                           |

**El único que hay que fabricar es el de Admin**, y hay que fabricarlo **una vez por tienda**: un
token de Admin API pertenece a una tienda y no se comparte entre ellas. No viene con `env pull` y no
se hereda del proyecto anterior.

Existe porque **la Storefront API no puede escribir en la tienda**: no crea draft orders, no escribe
metafields de cliente y no crea companies. Todo el flujo de cotización del portal depende de él.

Al crear el custom app, marcá de una todos los scopes que el portal usa —agregarlos después obliga a
reinstalar la app— y **guardá el token apenas se muestre: aparece una sola vez**.

Lo que ese listado tampoco dice y acá importa:

- **`ADMIN_API_ACCESS_TOKEN` necesita `write_customers` y `write_companies`.** Sin el primero, la
  solicitud de acceso devuelve 502 y el formulario dice que falló; sin el segundo no se pueden
  crear companies.
- **El token de Storefront necesita `unauthenticated_read_product_inventory`.** Sin él, pedir
  `quantityAvailable` ensucia la query **entera** con ACCESS_DENIED — no falla solo ese campo.
- **En local, poné aunque sea un placeholder en `ADMIN_API_ACCESS_TOKEN`.** Si falta, el worker
  lanza dentro de `createAppLoadContext` y **el sitio entero tira 500**, no solo las cotizaciones.

---

## 3. `app/lib/const.js` — las decisiones

Es el único archivo que hay que tocar para cambiar de tienda. Si algo específico de una tienda
aparece en un componente, es un bug de plantilla y su lugar es acá.

### Mercado y idiomas

`STORE_COUNTRY`, `STORE_CURRENCY`, `STORE_LANGUAGES`. El país y la moneda son de la **tienda**, no
del idioma: el prefijo de ruta solo elige idioma. Apuntar a un market que no existe hace que
Shopify caiga en silencio al primario y los precios dejen de ser los que esperás.

### Portal cerrado

| Constante               | Qué decide                        | Cuidado                                                                             |
| ----------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| `REQUIRE_LOGIN`         | Si hay navegación anónima         | En `true` el catálogo **deja de ser indexable** y `robots.txt` pasa a `Disallow: /` |
| `REQUIRE_CUSTOMER_TAGS` | Qué tags hacen falta para entrar  | Los pide **todos**. Lista vacía = apagado. Abre la puerta, **no habilita precios**  |
| `REQUIRE_B2B_COMPANY`   | Si hace falta company para entrar | En `true` **sin companies cargadas nadie entra**, ni la demo                        |
| `ENABLE_CART`           | Si hay checkout directo           | En `false` se cierran `/cart` y `/api/cart/*`. **No alcanza**: ver paso 4           |

**Las dos del medio son excluyentes en la práctica y hoy manda la de tags** (`mayorista` +
`mayorista-aprobado`), con `REQUIRE_B2B_COMPANY` en `false`, porque esta tienda no tiene companies.
Es una chapuza consciente: aprobar es poner un tag en el admin —un click— en vez de crear company +
location + meterla en el B2B market.

> **Lo que la chapuza NO resuelve:** el precio. Un tag no elige catálogo; los catálogos cuelgan de
> la company location. Quien entra por tag ve el catálogo **sin importes**, porque el servidor
> prefiere no mostrar precio antes que mostrar el del mercado por defecto. Si el cliente tiene que
> ver precios mayoristas, hay que crear la company — no hay atajo por tags.

### Plata

`DISCOUNT_SLOTS`, `DISCOUNT_STACK_MODE`, `MAX_LINE_DISCOUNT`, `MINIMUM_ORDER_AMOUNT`,
`ESTIMATED_TAX_RATE`, `CATEGORY_KEY_SOURCE`.

**Ninguna de estas es decisión técnica.** `cascade` vs `additive` cambia lo que se cobra: dos
descuentos del 10% dan 19% en cascada y 20% sumados. `ESTIMATED_TAX_RATE` viene en `null` a
propósito porque exige saber si los precios de Shopify ya incluyen impuesto — si vienen con IVA y
le sumás 21%, el presupuesto queda 21% por arriba de lo que después factura Shopify.

Acordalas con el cliente **por escrito** antes de tocarlas (skill `criterio-de-negocio`).

### Contacto y condiciones

`SALES_CONTACT`, `COMMERCIAL_TERMS`. Los campos en `null` no se renderizan. **No inventes plazos ni
zonas de entrega para que la demo se vea llena**: en cuanto alguien lo muestra, se convierte en una
promesa comercial.

### Modelo padre/hijo

`PARENT_PRODUCT_FILTER` viene en `null`. Encenderlo solo si la tienda realmente usa ese modelo:
filtrar por un tag que nadie tiene deja la búsqueda devolviendo **cero resultados para cualquier
palabra**, sin error.

---

## 4. Configuración del lado de Shopify

Esto no se resuelve en el repo y es donde más cosas fallan calladas.

### 4.1 Definiciones de metafield para la solicitud de acceso

```
npm run setup:b2b
```

Crea las nueve, con el rótulo que sale del diccionario en castellano para que quien aprueba lea lo
mismo que ve el comprador. Es idempotente: chequea qué existe y solo agrega lo que falta, así que
correrlo dos veces no rompe nada. Necesita `ADMIN_API_ACCESS_TOKEN` con scope `write_customers`.

A mano es **Configuración → Datos personalizados → Clientes**, namespace `b2b`, tipo _texto de una
línea_, una por cada key de `app/data/b2b-request.js`.

> **Si lo salteás:** `metafieldsSet` guarda igual y devuelve éxito, pero **el admin no muestra
> metafields sin definición**. La solicitud queda perfectamente guardada y quien tiene que aprobarla
> abre la ficha del cliente y no ve nada. Ningún error, ninguna pista.

Chequeo: `npm run doctor` → "Solicitud mayorista (metafields)".

### 4.2 Catálogo y precios

Crear el catálogo B2B y asignarlo. **En no-Plus** se asigna al B2B market y las company locations
entran a ese market; **en Plus** se puede asignar directo a la location con `catalogContextUpdate`.

> **Si lo salteás:** el comprador entra, ve el catálogo y ve **los precios del mercado por
> defecto** — precios reales, de otro comprador, con cara de correctos.

### 4.3 `checkoutToDraft` en cada company location

**Clientes → Empresas → [empresa] → Ubicaciones → [ubicación] → Envío de pedidos → "Enviar todos
los pedidos como borradores para revisión".**

> **Si lo salteás:** `ENABLE_CART = false` apaga el carrito **de este storefront y nada más**. El
> mismo comprador entra al theme de Liquid, ve los precios de su company y paga ahí, salteándose la
> revisión comercial entera. Te enterás cuando alguien ya compró.

Tres formas de que no se olvide, de mejor a peor:

1. Lo setea el `companyCreate` del endpoint de aprobación (`buyerExperienceConfiguration`)
2. Un Flow: trigger `Company location created` → acción `Update checkout to draft for company location`
3. A mano, por location

Chequeo: `npm run doctor` → "Checkout a draft (checkoutToDraft)".

### 4.4 Menús, descripción y colecciones

Menús `header-menu`, `collections-menu` y `footer` por handle; descripción de la tienda; las
colecciones que son las categorías de la home.

> **Si faltan:** Shopify devuelve `null` sin error y el componente cae a su fallback. El header
> queda con un menú de emergencia que no es el de la tienda.

Chequeo: `npm run doctor` → los tres menús y "Descripción de la tienda".

### 4.5 Metafields de producto

`app/data/metafields.js` es la lista canónica. **Las definiciones tienen que existir en el admin** o
la query devuelve `null` en silencio. La lista que trae el repo viene de la vertical de iluminación
del fork: revisala contra la tienda nueva antes de asumir que aplica.

---

## 5. Marca

- **Colores y tipografía:** bloque de tokens arriba de `app/styles/_app.scss`. Las escalas están en
  `DESIGN.md` y el gate las verifica en líneas nuevas.
- **Textos de UI:** `app/i18n/translations/*.json`. Un idioma nuevo es sumarlo a `STORE_LANGUAGES` y
  poner su JSON; `app/lib/i18n.js` no se toca.
- **Nombre y logo:** salen de Shopify (`shop.name`, `shop.brand.logo`). No se hardcodean.

⚠️ Sumá la marca del cliente nuevo a `BRAND_WORDS` en `scripts/check-template-leaks.mjs`, para que
el siguiente proyecto no herede sus datos.

---

## 6. Verificación final

```
npm run doctor      # la tienda tiene lo que el código declara
./scripts/verify.sh # formato, lint, escalas, fugas de plantilla, codegen, build
```

Y después **abrir el navegador**, que es donde aparece lo que no se ve en el código. Los tres
caminos que hay que recorrer a mano:

1. **Sin sesión** → cualquier URL redirige a `/ingresar`
2. **Con sesión, sin company** → `/cuenta-en-revision`, el formulario guarda y el admin muestra los datos
3. **Con sesión y company** → catálogo con **los precios de esa company**, y el presupuesto emite draft order

El tercero es el que no se puede simular: necesita una company real y un túnel público para
Customer Account API.

---

## 7. Lo que queda como decisión del negocio

No las tomes en silencio; llevalas al PM con opciones y consecuencias.

- **A qué catálogo entra un cliente aprobado.** Es el precio que va a pagar.
- **Cómo acumulan los descuentos** y cuál es el techo por slot.
- **Si los precios de Shopify llevan impuesto incluido.** De esto depende `ESTIMATED_TAX_RATE`.
- **Qué pasa con una solicitud rechazada.** Hoy no existe ese estado: quien es rechazado espera
  para siempre en "cuenta en revisión".
- **Quién avisa por email al aprobar.** El copy lo promete. Shopify no lo manda solo — hay una
  acción de Flow (`Send B2B access email`) o lo manda el endpoint de aprobación.
- **Con varias company locations, cuál manda.** Hoy se toma la primera, y eso es un default, no una
  decisión: elegir mal es mostrar los precios de otra sucursal.

---

## Apéndice: hacerlo por CLI en vez de a mano

`shopify store execute -s <tienda>.myshopify.com -q '<query>'` corre Admin GraphQL contra la tienda
y sirve para auditar y configurar sin pasar por el admin. Dos cosas antes de intentarlo:

```
shopify store info --store <tienda>.myshopify.com   # plan y datos de la tienda
shopify store execute -s <tienda>.myshopify.com -j \
  -q '{ currentAppInstallation { accessScopes { handle } } }'
```

**Mirá los scopes primero.** La sesión del CLI usa un app cuyos permisos suelen ser mínimos —en
Picafili son `read_products` y `write_products` y nada más—, así que `companies`, `markets` y las
definiciones de metafield de cliente quedan fuera de alcance. `companies` y `markets` contestan
ACCESS_DENIED, que es honesto; pero **`metafieldDefinitions` de otro `ownerType` puede devolver una
lista vacía en vez de un error**, y "no hay ninguna" se lee igual que "no tenés permiso". Confirmá
con un control sobre `ownerType: PRODUCT` antes de concluir que falta algo.

Para configurar de verdad hay que sumarle scopes al custom app (`write_customers`,
`write_companies`, `read_markets`) en **Configuración → Apps y canales de venta → Desarrollar apps**.

---

## Pendiente de verificar

- Si en planes no-Plus la asignación de una company location a un B2B market se puede automatizar
  por API, o si es sí o sí un paso en el admin. De eso depende que aprobar sea un solo endpoint.
