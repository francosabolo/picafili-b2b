# Backlog B2B — Picafili × PowerB2X

> Storefront headless (Hydrogen) que tiene que verse **Picafili** y funcionar como **portal B2B
> privilegiado**. Este documento es el backlog: benchmark → qué busca un comprador B2B → decisiones
> de negocio pendientes → épicas priorizadas con criterios de aceptación.
>
> Fecha: 2026-08-03. Fuentes al pie.

---

## 1. Look & feel: qué hay que traer de picafili.com.ar

Tokens extraídos del theme vivo (variables CSS del sitio):

| Token              | Valor                                                          | Uso en el theme actual                          |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------------- |
| Crema (fondo base) | `#FFEFD8` — `rgb(255,239,216)`                                 | fondo de header, cards, superficies             |
| Magenta (marca)    | `#E72475` / `#E72A74`                                          | logo, links, badges, botón primario alternativo |
| Turquesa           | `#00A8BE`                                                      | botón primario (CTA "Descubrir colección")      |
| Naranja            | `#F08220`                                                      | badges, acentos                                 |
| Petróleo           | `#00373F`                                                      | texto sobre fondos claros de alto contraste     |
| Vino               | `#7E0E3C`                                                      | contraste sobre magenta                         |
| Amarillo           | `#FFBB59`                                                      | acento                                          |
| Tipografía         | **Montserrat** — body 500, bold 800, headings 500, escala 1.15 | todo el sitio                                   |
| Radios             | botones `18px` (outset 20), inputs `10px`, media `20px`        | lenguaje muy redondeado                         |

**Gap contra lo que hay hoy:** el storefront actual es el kit de marca de PowerB2X — negro `#1a1a1a`,
violeta, banner "Empower your Ecommerce business", tipografía geométrica, cero crema. Es literalmente
la paleta opuesta. Todo el layer visual se rehace.

**Criterio de convivencia de marcas (a validar con vos, ver §3):** Picafili es el dueño de la
experiencia; PowerB2X es la plataforma. Lo que propongo es Picafili al 100% en la piel, y PowerB2X
solo como firma discreta ("Powered by") en el footer — igual que Shopify no se planta en el header de
las tiendas de sus merchants.

---

## 2. Qué busca un comprador B2B (benchmark)

Los números del mercado 2026, que son los que justifican el orden del backlog:

- **83%** de los compradores B2B prefieren auto-gestionarse el pedido online, sin vendedor.
- **73%** están dispuestos a poner órdenes de +USD 50.000 por self-service; **39%** arriba de USD 500.000.
- **71%** del mercado ya son compradores jóvenes que completan dos tercios del journey solos y esperan
  búsqueda guiada, no un catálogo PDF.
- **80–85%** de las empresas B2B ya ofrecen algún portal de self-service: dejó de ser diferencial y
  pasó a ser piso.

Las **cinco capacidades** que el benchmark señala como no negociables, en orden:

1. **Precio de mi cuenta, visible apenas entro** (nada de "consultar precio" si ya soy cliente).
2. **Stock real**, no "disponible/consultar".
3. **Recompra en un clic** desde el historial (el B2B es reposición, no descubrimiento).
4. **Aprobaciones** dentro del checkout cuando hay más de un comprador por empresa.
5. **Condiciones de pago** — net terms, orden de compra (PO number).

Y lo que separa a los buenos de los mediocres: contenido de producto rico, comparación instantánea,
grillas escaneables con specs visibles sin abrir cada ficha, y listas/checklists reutilizables
(el patrón que hace bien Coco Republic).

---

## 3. Decisiones de negocio antes de codear

Estas tres cambian la arquitectura entera. No las decido yo (skill `criterio-de-negocio`).

### 3.1 Tier prices: nativo de Shopify vs. implementación propia — **recomiendo nativo**

Desde **abril 2026**, Shopify liberó las features B2B fundacionales (company profiles, hasta 3
catálogos, **volume pricing**, **quantity rules**, net terms) a los planes **Basic, Grow y Advanced**,
sin costo extra. Ya no es exclusivo de Plus.

Eso significa que los tier prices deberían vivir como **catálogos B2B de Shopify**, no como metafields
ni tabla propia:

|                  | Nativo (catálogos B2B)              | Custom (metafields / DB propia)                                     |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------- |
| Fuente de verdad | Shopify admin, la maneja el cliente | nosotros, cada cambio es un deploy o un panel que hay que construir |
| Checkout         | respeta el precio solo              | hay que forzar precios → draft orders sí o sí                       |
| Costo            | incluido en el plan                 | horas de desarrollo + mantenimiento eterno                          |
| Techo            | 500 company profiles                | ilimitado pero propio                                               |

**Lo que hay que verificar antes:** que la tienda `picafili.myshopify.com` tenga **B2B habilitado** y
**new customer accounts** activadas. Sin eso, el camino nativo no arranca.

### 3.2 "Lista de clientes" — necesito que me aclares qué es

El término mapea a dos cosas muy distintas:

- **(a) Empresas/clientes con su pricing**: el merchant ve y administra sus cuentas B2B → son las
  **Companies** de Shopify, con locations y catálogo asignado. Es admin, vive en Shopify.
- **(b) Listas de productos por cliente**: el comprador guarda "mi lista de reposición mensual" y
  recompra de ahí → son **quick order lists**, y se construyen en el storefront.

Sospecho que querés **las dos**, pero son épicas separadas y con dueños distintos.

### 3.3 El flujo de cotización actual vs. el carrito B2B nativo

Hoy hay un flujo de quotes propio: cookies → `draftOrderCreate` por Admin API → `/account/quotes`.
Si vamos a precios nativos por company, gran parte de eso se vuelve redundante: el comprador ve su
precio y compra, sin pedir cotización. Mi recomendación es **convivencia**: compra directa con precio
de catálogo, y la cotización queda solo para pedidos especiales (fuera de catálogo, cantidades
atípicas, condiciones a negociar). Pero es tu decisión de negocio, no mía.

---

## 4. Backlog priorizado

Prioridad por valor/esfuerzo. Cada épica cierra con su gate en verde (`./scripts/verify.sh`) +
verificación visual en 1440 y 390.

### P0 — Fundaciones (sin esto no hay demo creíble)

**E1 · Sistema de diseño Picafili**
Reemplazar el kit PowerB2X por los tokens de §1: variables SCSS/Tailwind (crema, magenta, turquesa,
naranja, petróleo), Montserrat 500/800, radios 18/20px, y logo Picafili en header y footer.
_AC:_ ningún color ni asset de PowerB2X visible fuera del "Powered by" del footer; contraste AA en
texto sobre crema y sobre magenta; header, footer, cards, botones, inputs y tablas migrados.

**E2 · Zona privilegiada — el "estás adentro" visible**
El guiño que pediste, sistematizado en vez de decorativo:

- Estado logueado explícito en el header: nombre de la empresa + location activa.
- Badge/chip "Cuenta mayorista" persistente.
- Precio B2B mostrado **junto al precio de lista tachado**, con el ahorro en % ("tu precio: −22%").
- Banda superior con lo que solo ve un mayorista: condiciones de pago, mínimo de compra, próximo
  tier alcanzable.
- Landing pública distinta para quien no está logueado: qué gana siendo mayorista + alta de cuenta.
  _AC:_ un usuario anónimo y uno logueado ven headers claramente distintos; el ahorro se calcula del
  precio de catálogo real, nunca hardcodeado.

**E3 · Company + location context (recipe B2B de Hydrogen)**
Base técnica de todo lo demás: `B2BLocationProvider`, selector de location, `buyerIdentity` con
`companyLocationId`, queries de producto contextualizadas con `@inContext(buyer: $buyer)`, limpieza
al logout.
_AC:_ con un contacto de company de prueba, el PDP muestra el precio del catálogo asignado; con
múltiples locations aparece el selector; el carrito conserva el contexto.

### P1 — Las cinco capacidades del benchmark

**E4 · Tier prices visibles (`quantityPriceBreaks`)**
Tabla de quiebres por cantidad en PDP y en la tabla "Configure your Product", con el tier activo
resaltado y un nudge "llevando N más, pagás X".
_AC:_ los breaks salen de la Storefront API, no de un JSON local; el carrito respeta el precio del tier.

**E5 · Quantity rules (`minimum`, `maximum`, `increment`)**
Selector de cantidad que respeta múltiplos y mínimos, en PDP y en el carrito, con el motivo explicado
("se vende por bulto de 6").
_AC:_ no se puede llegar al checkout con una cantidad inválida; el mensaje es específico, no genérico.

**E6 · Recompra en un clic**
Historial de órdenes con "repetir pedido" (todo o por línea) y una lista de reposición guardada
(la lectura (b) de §3.2).
_AC:_ repetir un pedido arma el carrito con las cantidades originales y avisa qué quedó sin stock.

**E7 · Stock real**
Reemplazar el "In stock" binario actual por disponibilidad por variante, y fecha estimada cuando no hay.
_AC:_ el estado sale de `availableForSale`/inventario, no de un badge fijo.

**E8 · Condiciones de pago y PO**
Net terms de la company visibles antes del checkout y campo de número de orden de compra.
_AC:_ el PO viaja en la orden y queda visible en el detalle.

### P2 — Velocidad de compra (lo que fideliza)

**E9 · Quick order pad** — pegar SKU+cantidad en bloque o subir CSV, resolver contra el catálogo y
armar el carrito. Es la feature que más rápido convierte a un comprador de reposición.
**E10 · Grilla escaneable con specs** — comparación sin abrir cada ficha, filtros por atributo.
**E11 · Multi-usuario y aprobaciones** — varios compradores por company, con umbral de aprobación.
**E12 · Descarga de documentación** — remitos, facturas, lista de precios en PDF/CSV.

**E17 · Footer del prototipo** — el footer actual es el del fork: menú de Shopify a secas, sin la
información que un comprador mayorista busca antes de cerrar un pedido. Portar el del prototipo Noblex.

Lo que sí está definido, independiente de la maqueta:

- **Bloque de contacto comercial** — el dato que más se busca en un footer B2B: teléfono/WhatsApp del
  equipo de ventas, email de pedidos, horario de atención. Hoy no está en ningún lado del sitio.
- **Condiciones comerciales** — pedido mínimo, plazos de entrega, zonas de envío, medios de pago
  habilitados para cuenta corriente. Es la pregunta que hoy obliga a llamar por teléfono.
- **Accesos de cuenta** — mis pedidos, mis presupuestos, lista de precios. Un mayorista vuelve al
  footer a buscar eso.
- **Legales** — las policies ya vienen de Shopify (`SHOP_POLICY`), hoy en inglés y sueltas.
- Como el resto de la plantilla: los textos a i18n, los datos de contacto a `app/lib/const.js` o a
  metaobjects de Shopify — **no** hardcodeados en el componente.

⚠️ **Falta la referencia visual.** El prototipo está detrás del SSO de Vercel y no se puede leer desde
acá: hace falta una captura del footer para definir columnas, orden y jerarquía. Sin eso se puede
construir el contenido pero no garantizar que sea "como el prototipo".

### P3 — Deuda que arrastra el fork (arreglar mientras se toca cada zona)

- ✅ ~~Nav a `/products/demo-product` → 500~~ — el chequeo de 404 corría **después** de leer
  `product.variants`. Ahora devuelve 404. El link del menú sigue apuntando a un handle inexistente:
  eso se corrige en el menú de Shopify, no acá.
- ✅ ~~Precios mezclan monedas y el ícono de descarga se superpone al precio~~ — había un `'€'`
  hardcodeado en `ProductPrice`, y la columna de precio de la tabla tenía 8% de ancho.
- ✅ ~~`parseAsCurrency is not defined` en el PDP~~ — existía en `app/lib/utils.js`, faltaba el import.
  Tiraba ReferenceError al aplicar el filtro de precio.
- ✅ ~~La galería del PDP a veces renderiza vacía (flechas sin imagen)~~ — no se pudo reproducir, así que
  se cerraron las tres rutas al síntoma: nodos de imagen sin `url` contaban para el total (flechas y
  contador sobre una caja vacía), el índice se resincronizaba por efecto (el primer frame del producto
  nuevo usaba el índice del anterior) y `isLoading` nunca llegaba a la galería.
- ✅ ~~Acordeones vacíos en el PDP~~ — "Main Features" y "Details" se renderizaban aunque no tuvieran
  contenido, porque los metafields que espera el componente son del vertical iluminación. Ahora se
  ocultan si están vacíos. **Remapeo hecho (parcial).** Sondeando identifiers contra la Storefront API se
  confirmó que **ninguno** de los metafields del fork (lumens, CRI, protection_index…) existe en esta
  tienda. Los únicos con datos son `custom.material` (Babycotton, Gabardina, Silicona) y
  `shopify.color-pattern`. `allProductMetafields` ahora pide solo esos; la lista vieja quedó como
  `legacyLightingMetafields`, sin uso. El PDP muestra Material. **Pendiente:** medidas, edad
  recomendada y composición no existen como metafields — si el negocio los quiere en la ficha, hay que
  crearlos y cargarlos en Shopify primero.
- ✅ ~~Descripción con Lorem ipsum~~ — el componente inyectaba texto latín hardcodeado cuando el
  producto no tenía descripción. Ahora no muestra la sección.
- ✅ ~~Ícono CE y clase eléctrica en todos los productos~~ — se renderizaban incondicionalmente: una
  manta de bebé mostraba marcado CE. Ahora dependen de que el producto los declare.
- ✅ ~~`api.draft-orders.jsx` usa `context.shopifyAdminApiClient`~~ — arreglado hace tiempo.
- ✅ ~~Workflows de Oxygen heredados del fork fallando en cada push~~ — borrados (`1000018987`, `1000031099`).
- ✅ ~~Selector de países muerto~~ — `countries.js` → `/api/countries` → `CountrySelector`, y el componente
  no se montaba en ningún lado. Cadena completa borrada.
- ✅ ~~`package.json` se llamaba `herlighting-hydrogen` y el README era el del skeleton~~ — renombrado y
  reescrito; se agregó `.env.example`.
- ✅ ~~Ruta muerta `characters._index.jsx`~~ — borrada.
- ⚠️ **`($locale).collections.$handle.jsx` no degrada ante un `filter.*` invalido en la URL.** Un JSON
  válido pero con una clave que no existe en `ProductFilter` llega tal cual a Shopify, que responde
  error, y la colección entera devuelve 404. `collections.all.jsx` sí lo envuelve en try/catch. Un
  link viejo o editado a mano tira abajo la página; debería ignorar el filtro y seguir.

---

## 5. Prototipo Bazar Noblex — los flujos que hay que portar

Referencia: `bazar-noblex-diseno-ux-desarrollo-*.vercel.app`. Es un prototipo Next.js con data mock,
así que **se porta la UX, no el código**: acá hay que rehacerlo en Hydrogen/Remix + SCSS modules. Y la
piel es Noblex (azul marino corporativo); lo que se transfiere es la **estructura**, no la pintura.

### 5.1 El modelo de estados — esto es la "zona privilegiada" bien resuelta

El prototipo tiene un switcher de demo ("Ver como") con cuatro estados. Es el hallazgo más importante:
el privilegio no se comunica con adornos, se comunica **mostrando lo que todavía no podés ver**.

| Estado                     | Qué ve                                                                            | Equivalente en Shopify B2B                            |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Invitado**               | catálogo público, sin precios                                                     | sin sesión de customer                                |
| **Registrado (pendiente)** | catálogo + banner "tu cuenta está pendiente de aprobación"; sin precios ni pedido | customer existe pero **sin company contact** asignada |
| **Cliente aprobado**       | precios de su lista, nota de pedido, historial                                    | customer es company contact con **catálogo asignado** |
| **Vendedor**               | opera el catálogo **en nombre de** un cliente                                     | ⚠️ sin equivalente nativo en storefront               |

El gating de precio es literal: la card muestra 🔒 _"Precio visible para clientes aprobados"_ en vez del
precio. Eso hace más por el "estás adentro" que cualquier badge.

### 5.2 Flujos, uno por uno, con su costo real

| Flujo del prototipo                                                            | Cómo se resuelve                                                                                             | Costo                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Banner por estado de cuenta (pendiente / aprobada + **grupo de precios**)      | leer `companyContacts` + catálogo por Customer Account API                                                   | **nativo**, barato                                                               |
| "Precio para _Distribuidora El Sol_ · lista _mayorista-plus_" en el PDP        | query contextualizada `@inContext(buyer:)`; el nombre del catálogo sale de la company                        | **nativo**                                                                       |
| Precio lista tachado / **Tu precio**                                           | precio del catálogo vs. precio público                                                                       | **nativo**                                                                       |
| **Venta por bulto cerrado** ("caja x6 · mín. 1 caja", stepper que suma de a 6) | `quantityRule` (`minimum`/`increment`)                                                                       | **nativo**                                                                       |
| Precios **+ IVA** (subtotal, IVA 21%, total estimado)                          | B2B en Shopify es tax-exclusive por defecto                                                                  | **nativo**                                                                       |
| **Compra rápida** (buscar por SKU, filtros, tabla, agregar sin salir)          | pantalla propia sobre la Storefront API                                                                      | medio — pero el PDP ya tiene la tabla "Configure your Product", que es esta fila |
| **Nota de pedido** (drawer, "Pedido a nombre de X", revisar y enviar)          | ya existe en el repo: `QuoteContext` + `draftOrderCreate`                                                    | **ya construido**, hay que revestirlo                                            |
| **Repetir pedido** desde el historial                                          | leer la orden y rearmar la nota                                                                              | barato                                                                           |
| **Pedido mínimo** ("$150.000 + IVA · te faltan $32.240")                       | ⚠️ Shopify **no** tiene mínimo por monto nativo (las quantity rules son por producto)                        | validación propia en la nota + Checkout Validation Function si se quiere blindar |
| **Modo vendedor** ("Comprando para: …")                                        | ⚠️ **no existe nativo en storefront**. Requiere auth de vendedor, listado de companies y contexto suplantado | **la más cara del set** — tratarla como épica aparte                             |
| Páginas de **Marca** (Tramontina)                                              | colecciones por vendor o metaobjects                                                                         | barato                                                                           |

### 5.3 Qué cambia en el backlog

- **E2 pasa a ser "máquina de estados de cuenta"**, no un badge: los cuatro estados con su gating de
  precio y de pedido, más el switcher "Ver como" como **herramienta de demo** (feature flag, nunca en
  una tienda real de cara al público).
- **E9 (quick order pad) sube a P1**: en el prototipo es "Compra rápida" y es la pantalla donde de
  verdad se compra. Reusa la tabla que ya existe en el PDP.
- **E13 nueva · Pedido mínimo por monto** — gap real de Shopify. **Decidido: solo avisa** — muestra
  cuánto falta pero deja enviar igual; el equipo comercial resuelve. Sin Checkout Validation Function,
  entonces: es una banda informativa en la nota de pedido. Falta definir el monto y si es global o por
  cuenta.
- **E14 nueva · Modo vendedor** — **Decidido: solo demo visual**. El bar "Comprando para: X" con
  selector mock, sin auth de vendedor ni contexto suplantado real. Se ve en la demo, no es funcional.
  Si alguna vez se hace funcional, es la épica más cara del set y toca permisos.
- **E15 nueva · Páginas de marca** — barata y da sensación de catálogo grande.
- El "grupo de precios" visible en Mi cuenta (_"Lista asignada por el equipo comercial"_) es el detalle
  que más comunica privilegio con menos código: una línea que dice a qué lista pertenecés.

## 5.4 Estado de avance

| Épica                                   | Estado                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1 · Sistema de diseño Picafili         | ✅ hecho — tokens, Montserrat, header, hero, grilla, PDP, footer, drawer. **Mobile 390 verificado**: colección, tabla, compra rápida, presupuesto y **ficha de producto**, sin desborde horizontal. Falta solo `/account/*` (necesita túnel)                                                                                                                                                                                                                       |
| E2 · Máquina de estados de cuenta       | ✅ hecho — 4 estados, switcher de demo, banners, gating de precio y de pedido, barra de modo vendedor                                                                                                                                                                                                                                                                                                                                                              |
| E13 · Pedido mínimo (modo aviso)        | ✅ hecho — total y faltante en la barra de resumen y en el drawer. **Monto `150000` es provisorio** (`MINIMUM_ORDER_AMOUNT` en `app/lib/const.js`)                                                                                                                                                                                                                                                                                                                 |
| E4 · Tier prices                        | ✅ `quantityPriceBreaks` en los fragments + tabla en el PDP con el tramo vigente marcado y nudge al siguiente. Sin quiebres configurados no renderiza                                                                                                                                                                                                                                                                                                              |
| E5 · Quantity rules                     | ✅ `quantityRule` respetado en los tres steppers (configurador, compra rápida y drawer), con aviso "De a N u."                                                                                                                                                                                                                                                                                                                                                     |
| E3 · Company + location context         | 🟡 base hecha (`app/lib/b2b.server.js` lee la company y manda sobre el switcher). Falta el selector de location y las queries `@inContext(buyer:)` — necesitan una company de prueba para verificarse                                                                                                                                                                                                                                                              |
| E9 · Compra rápida                      | ✅ completa — búsqueda por nombre/SKU, filtros por Color y Material (los que la tienda expone, acumulables), aviso de resultados truncados y "Descargar cotización (CSV)"                                                                                                                                                                                                                                                                                          |
| E15 · Páginas de marca                  | ❌ descartada — los 24 productos del catálogo son vendor `Picafili`. Una sola marca: la página sería el catálogo entero. Revisar solo si entran marcas de terceros                                                                                                                                                                                                                                                                                                 |
| Diseño Picafili (2ª pasada)             | ✅ galería B2B con miniaturas laterales, drawer de presupuesto con pie fijo y total de línea, tarjetas con SKU/stock/CTA, filtros legibles, barra de resumen de ancho completo, castellano por defecto                                                                                                                                                                                                                                                             |
| Performance de imágenes                 | ✅ la ficha bajaba ~1,1 MB: `ProductItem` pedía 800px reales para miniaturas de 220 y la principal 1400px para una caja de 564                                                                                                                                                                                                                                                                                                                                     |
| Analytics                               | ⚠️ decisión pendiente — GTM pasó a `PUBLIC_GTM_ID` y hoy no carga. El ID hardcodeado era el contenedor de PowerB2X: definir a qué cuenta debe ir la medición de Picafili                                                                                                                                                                                                                                                                                           |
| Verificación end-to-end                 | ✅ los 4 estados recorridos en colección, PDP y Compra rápida. Guion en `docs/demo-script.md`. Se corrigió una fuga: el estado pendiente veía total y precios en la barra de la nota de pedido                                                                                                                                                                                                                                                                     |
| E7 · Stock real                         | ⛔ bloqueado por config — el token de Storefront no tiene el scope `unauthenticated_read_product_inventory` y Shopify responde ACCESS_DENIED. La UI ya muestra el número apenas el campo exista                                                                                                                                                                                                                                                                    |
| E16 · Home del portal                   | ✅ hecha — hero + categorías (las colecciones de la tienda) + destacados, con CTA y copy según estado de cuenta. Escrita como plantilla: nombre y descripción salen de Shopify                                                                                                                                                                                                                                                                                     |
| E2 · Ahorro en % vs. precio de lista    | ✅ hecho — badge `−16%` calculado del dato real de Shopify. Los productos con `compareAtPrice` por debajo del precio no muestran nada: anunciarían un ahorro negativo                                                                                                                                                                                                                                                                                              |
| Carrito de compra directa               | ✅ vuelve detrás de `ENABLE_CART` (`app/lib/const.js`). Drawer rediseñado (no tenía CTA de checkout: el resumen quedaba fuera del área visible), controles con stepper e icono, todo a i18n. **Decidido: conviven con jerarquía** — presupuesto primario (botón lleno), carrito secundario (icono con borde), en la tarjeta y en el configurador de la ficha                                                                                                       |
| Sistema de diseño (`DESIGN.md`)         | ✅ escalas de tipografía, espaciado, radios y color + chequeo en el gate. El CSS tenía 51 tamaños de fuente, 26 radios y 134 espaciados distintos; la deuda bajó de ~470 valores fuera de escala a ~100 y **dejó de crecer**: el gate no deja entrar valores nuevos                                                                                                                                                                                                |
| Performance de imágenes (2ª pasada)     | ✅ la ficha cargaba 1,86 MB. La foto principal pedía `width=1400` (417 KB) para una caja de 564px, y hasta 1800 (506 KB) en pantallas anchas. Shopify ya servía WebP: el problema era el ancho. srcset cortado en 1200                                                                                                                                                                                                                                             |
| Carrito de presupuesto (`/presupuesto`) | ✅ pantalla propia con la cadena de descuentos desplegada por línea. El drawer queda para el vistazo rápido y la barra inferior lleva a la pantalla                                                                                                                                                                                                                                                                                                                |
| Cadena de descuentos                    | ✅ modelada con origen (`app/lib/discounts.js`): **Descuento 1 y 2** (acuerdo), **Descuento 3** (del presupuesto, lo carga el vendedor) y los de **categoría**. El 3 viaja al draft order como `appliedDiscount` en porcentaje. **1, 2 y categoría todavía no existen como dato en Shopify**: entran por `resolveLineDiscounts()` y nada más. ⚠️ Falta definir **cascada vs. suma** (`DISCOUNT_STACK_MODE`) y el **tope por línea** (`MAX_LINE_DISCOUNT`, hoy 30%) |
| E17 · Footer del prototipo              | 🟡 contenido hecho — contacto comercial, condiciones y accesos de cuenta, cada bloque se oculta si no tiene datos. Los datos salen de `SALES_CONTACT` y `COMMERCIAL_TERMS` en `app/lib/const.js`, los textos de i18n. **Faltan los datos del negocio**: teléfono, WhatsApp, horario, plazos, zonas y medios de pago están en `null` a propósito — un plazo inventado se convierte en promesa. Sigue faltando la captura del prototipo para la maqueta              |
| E6 · Recompra en un clic                | 🟡 mitad hecha — listas de reposición guardadas (`/listas`), con revalidación de precios contra el catálogo al cargar. Falta "repetir pedido" desde el historial de órdenes: necesita `/account/*`, o sea túnel                                                                                                                                                                                                                                                    |
| E8 · Condiciones de pago y PO           | 🟡 mitad hecha — campo de orden de compra en el presupuesto, viaja como `poNumber` del draft order. Falta confirmar contra Shopify (el token de Admin local es placeholder, solo se prueba en Oxygen) y los **net terms**, que necesitan una company B2B                                                                                                                                                                                                           |
| Gating de precios (server-side)         | ✅ los precios ya no salen del servidor si el visitante no puede verlos. Antes el gate era solo visual: **320 importes en el payload de `/collections/all` para un invitado**                                                                                                                                                                                                                                                                                      |
| E12 · Descarga de documentación         | 🟡 mitad hecha — lista de precios en CSV (`/api/lista-precios.csv`), generada en el servidor con gate real. Faltan remitos y facturas: necesitan el historial de órdenes, o sea `/account/*`                                                                                                                                                                                                                                                                       |
| E10 · Grilla escaneable con specs       | ✅ hecha — specs en la tarjeta y **vista de tabla comparativa** con toggle (`?vista=tabla`), columnas derivadas de los productos de la página. Las specs salen de `app/data/metafields.js`, sin keys hardcodeadas. En la tienda de demo la única mostrable es Material: `shopify.color-pattern` son gids                                                                                                                                                           |
| E11 · Multi-usuario y aprobaciones      | ⛔ bloqueado — necesita una company B2B de prueba en Shopify                                                                                                                                                                                                                                                                                                                                                                                                       |
| E14 · Modo vendedor                     | ✅ demo visual, según lo decidido: barra "Comprando para", switcher mock, sin auth de vendedor ni contexto suplantado real                                                                                                                                                                                                                                                                                                                                         |

### Qué destraba qué

Todo lo que queda del backlog formal depende de algo que no está en el código:

| Falta                                          | Destraba                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Túnel público (`/account/*` no corre en local) | E6 (repetir pedido), E12 (remitos, facturas), y la verificación visual de toda la zona de cuenta |
| Una company B2B de prueba                      | E3 (selector de location, `@inContext(buyer:)`), E8 (net terms), E11 (aprobaciones)              |
| Scope `unauthenticated_read_product_inventory` | E7 — la UI ya muestra el número apenas el campo exista                                           |
| Captura del footer del prototipo               | E17, la parte visual: el contenido ya está                                                       |
| Decisión de negocio                            | Analytics (a qué cuenta va la medición de Picafili)                                              |

⚠️ El túnel es el que más tapa: **hay una zona entera del portal que nadie está mirando**. El i18n de
`/account/*` se arregló a ciegas por esa razón.

## 5.5 Dónde vive el presupuesto en borrador — ✅ resuelto

`QuoteContext` guardaba las líneas en la cookie `quoteItems`, y **las cookies mueren a los 4 KB**.
Medido con datos reales: ~395 bytes por línea, o sea que a partir de la décima el navegador
**descartaba la cookie en silencio** y el comprador perdía el pedido entero, sin error en pantalla ni
en consola. Un pedido mayorista real tiene 20 o 30 líneas: el techo no era un caso borde, era el caso
normal.

**Resuelto** partiendo el almacenamiento: las líneas van a **localStorage** (~5 MB) y una cookie de
~46 bytes guarda solo `{count, lines, amount, currencyCode}` — lo único que el servidor necesita para
pintar la barra y el contador sin parpadeo. Las dos se escriben juntas y en el mismo orden. Incluye
migración desde la cookie vieja, para que nadie pierda un presupuesto a medio armar.

Verificado con **24 líneas = 16,2 KB**, cuatro veces el límite anterior: sobreviven la recarga, y el
HTML del servidor ya trae "24 artículos en el presupuesto" sin JavaScript.

**Sigue abierto el destino final.** localStorage es del navegador: no sobrevive a un cambio de
dispositivo ni se comparte entre el comprador y su vendedor. Si E3 avanza, el carrito de Shopify es
el candidato natural — lo persiste Shopify y elimina el problema. Un servidor propio es la tercera
opción, con más control y más mantenimiento.

## 5.6 Pasada de calidad y plantilla — lo que salió de mirar el sitio

No estaba en el backlog original. Salió de recorrer el sitio pantalla por pantalla, y vale
registrarlo porque **casi nada de esto se ve leyendo el código**.

**Bugs que rompían funcionalidad:**

- La **búsqueda del sitio devolvía cero resultados para cualquier palabra**: el fork le pegaba
  ` tag:parent` a todo término y ningún producto de esta tienda tiene ese tag (0 de 44). No tiraba
  error: mostraba "sin resultados".
- `AddToCartButton` **ignoraba la cantidad**: elegías 6 unidades, tocabas el carrito y entraba 1.
- El **botón de carrito estaba duplicado** en cada tarjeta.
- Un `filter.*` inválido en la URL **tumbaba la colección entera** con un 404.
- El **menú de emergencia mandaba "Home" a `powerb2x.com`** — y está activo, porque la tienda no
  tiene `header-menu` cargado.
- El **% del vendedor no se veía**: un `input { padding: 1rem }` global dejaba 16px de caja en un
  campo de 48px. El descuento se aplicaba pero el campo se veía vacío.
- **62px de la tabla del configurador eran inalcanzables** por un `overflow: hidden` puesto para
  recortar esquinas.
- **"Cargar más" ocupaba 88px aunque no hubiera más páginas**: la condición miraba `nextPageUrl`, que
  viene con valor igual, en vez de `hasNextPage`.

**Mobile 390** — verificado por primera vez (colección, tabla, compra rápida, presupuesto, ficha):

- El `h1` del reset eran **100px fijos**: "Presupuesto" se partía a mitad de palabra.
- La galería del PDP **corría la página a 688px** de ancho contra un viewport de 360, por
  `min-width: auto` en un flex item.
- El estado de stock era **un círculo de color sin etiqueta**.

**UX del listado**: filtros, orden y vista eran tres bloques a tres alturas sin alinear; "Ordenar"
era un encabezado del tamaño de un rubro; no había conteo de resultados; y **"Limpiar filtros"
existía seis veces en el DOM y ninguna era visible**. Además la grilla arrancaba a **dos pantallas de
scroll** (hero de 361px sin imagen + 361 palabras de descripción).

**i18n**: toda la zona de cuenta y cotizaciones estaba en inglés —incluido el alta de direcciones
completa—, porque los componentes de cotización son copias de los de pedidos y en la copia se perdió
el `useTranslation()`.

**Lo que se agregó al gate para que no vuelva** (`./scripts/verify.sh`, 6 pasos):

- `check-template-leaks.mjs` — corta emails, URLs y nombres de marca en líneas nuevas.
- Paso de **codegen propio**: el plugin puede fallar, imprimir el error y **salir 0**, dejando los
  tipos viejos y el gate en verde.
- `npm run doctor` (fuera del gate, necesita red) — contrasta lo que la plantilla declara contra lo
  que la tienda tiene: env vars, moneda, menús, metafields, tags, catálogos B2B, scope de inventario.

## 6. Propuesta de arranque

Fase 1 = **E1 + E2 + E3**: la tienda se ve Picafili, la máquina de estados comunica el privilegio, y el
contexto de company queda funcionando. Con eso ya hay demo mostrable. E4–E9 vienen encima sin
retrabajo, porque E3 es la base que las alimenta.

Bloqueante para E3: confirmar que la tienda tiene B2B habilitado y new customer accounts activadas.
E1 y E2 se pueden arrancar sin eso — de hecho E2 se puede demostrar entera con el switcher "Ver como"
antes de que exista una company real.

---

## Fuentes

- [B2B Buyer Portal: What Enterprise Buyers Expect in 2026 — Miva](https://blog.miva.com/b2b-buyer-portal-enterprise-ecommerce)
- [5 Self-Service Features B2B Customers Demand in 2026 — Zaelab](https://www.zaelab.com/blogs/5-self-service-features-b2b-customers-demand-in-2026)
- [The State of B2B Ecommerce 2026: Trends & Benchmarks — Elogic](https://elogic.co/blog/b2b-ecommerce-state/)
- [Shopify B2B Features: Complete Guide for 2026 — Anchor Group](https://www.anchorgroup.tech/blog/shopify-b2b-features)
- [Customizing B2B pricing using catalogs — Shopify Help Center](https://help.shopify.com/en/manual/b2b/catalogs/creating-catalogs)
- [Displaying quantity rules and volume pricing — Shopify Help Center](https://help.shopify.com/en/manual/b2b/store-customization/quantity-pricing)
- [B2B Commerce in Hydrogen — shopify.dev](https://shopify.dev/docs/storefronts/headless/hydrogen/cookbook/b2b)
- [Top B2B Ecommerce Examples: 2026 UX and Strategy Guide — WizCommerce](https://wizcommerce.com/blog/b2b-ecommerce-example/)
