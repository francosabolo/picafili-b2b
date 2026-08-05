# Arquitectura — dónde vive cada cosa

> Este documento responde una pregunta de producto, no de gusto técnico:
> **¿conviene hacer todo en Liquid o todo en Hydrogen para tener una aplicación
> B2B (storefront + app propia) fácil de replicar en distintos clientes?**
>
> `AGENTS.md` es el manual operativo del repo. Este es el documento de decisión.
> Lo que acá se decide, ahí se ejecuta.

---

## 0. La decisión en una página

**Todo depende de una sola pregunta:** ¿cada cliente conserva su theme y su
marca, o cada cliente recibe _el_ portal de ustedes?

- **Conserva su theme** → gana **app + app blocks en Liquid**. Cero puesta en
  marcha, cero deploys, el merchant sigue editando su theme, y **no hay frontend
  propio que mantener**. Este repo queda como prototipo de UX.
- **Recibe el portal** → se justifica **Hydrogen como plantilla**, servido en un
  subdominio propio (`b2b.cliente.com`). Un código, configuración por cliente. Se
  pierde el editor de theme y se asume el mantenimiento del frontend, pero **el
  trabajo se lleva de un cliente a otro** (§7) y el catálogo mayorista queda en
  **otro canal de venta**, fuera del alcance del retail (§2.5, punto 5).

**Dos correcciones que conviene tener a mano porque son las objeciones que
aparecen primero:**

- **Hydrogen no implica pagar servidores.** Oxygen viene incluido en el plan de
  Shopify que el cliente ya paga (todos los planes pagos salvo Starter y
  Agentic). El costo real de Hydrogen no es hosting: es **mantener el frontend**.
- **La portabilidad es un argumento fuerte pero discutible.** Un app block con
  CSS bien acotado puede ser razonablemente portable, y un portal por cliente
  tiene su propia puesta en marcha. Sirve como criterio, no como sentencia (§7).

**Y una conclusión incómoda que conviene leer antes de seguir:** los tres huecos
que motivaron esta discusión —portal de vendedores, compra por cuenta de un
cliente, y pedidos recientes— **no justifican Hydrogen por sí solos**. Los tres
se resuelven con la app que ya existe, más App Proxy. Si el argumento fuera solo
ese, la recomendación sería no hacerlo.

Lo que sí puede justificar Hydrogen es otra cosa: querer que **la experiencia de
compra sea un producto uniforme**, y no N themes adaptados uno por uno.

**Y hay una pregunta técnica que está antes que todas** (§2.5): _¿los descuentos
del negocio se pueden expresar como precios de Shopify?_ Si sí, Shopify calcula,
Liquid muestra y el checkout coincide — y no hace falta Hydrogen para vender. Si
no, hay que ir a presupuesto → draft order, y ahí Hydrogen deja de ser una
preferencia. **El modelo de descuentos decide la plataforma, no el organigrama
comercial.**

---

## 1. El eje: replicabilidad como producto

La pregunta en su forma más cruda:

> **¿Cada cliente conserva su theme y su marca, o cada cliente recibe el portal
> de ustedes?**

|                      | Conserva su theme            | Recibe el portal                         |
| -------------------- | ---------------------------- | ---------------------------------------- |
| Base                 | App + app blocks en Liquid   | Hydrogen como plantilla                  |
| Hosting              | de Shopify                   | de Shopify (Oxygen, incluido en el plan) |
| Puesta en marcha     | instalar app, soltar bloques | crear storefront, subdominio, env vars   |
| Mantener el frontend | lo hace Shopify              | **lo hacen ustedes, siempre**            |
| El merchant edita    | sí, theme editor             | no, es código                            |
| Coherencia de la UX  | la del theme de cada cliente | la del portal, igual para todos          |
| Catálogo mayorista   | mismo canal que el retail    | **canal aparte: el retail no lo ve**     |
| Techo funcional      | Liquid + App Proxy           | sin techo                                |

Lo que la pregunta **no** decide, y conviene sacarlo de la mesa: el **checkout**
siempre es de Shopify, y el **back-office** siempre es de la app. Lo único en
disputa es la **superficie de compra logueada**.

---

## 2. Los tres huecos, cuestionados uno por uno

El planteo fue: la app + Liquid resuelve casi todo, pero deja afuera el portal de
vendedores, la compra por cuenta de un cliente y los pedidos recientes. Vale
revisar si esos tres necesitan un **storefront** o son superficies de **la app**.

### 2.1 Portal de vendedores → probablemente no necesita storefront

Un vendedor no navega el catálogo público: opera cuentas, revisa pedidos, arma
presupuestos. Eso es back-office, y su lugar natural es la UI de la app.

Hay **un solo** argumento serio a favor de ponerlo en el storefront, y hay que
evaluarlo con el negocio: que el vendedor necesite ver **exactamente lo mismo que
ve el cliente** —su precio, sus quiebres por cantidad, su stock— porque atiende
por teléfono mientras el cliente mira la pantalla. Ese es el caso donde la
duplicación se paga sola. Si no es el caso, no.

### 2.2 Compra por cuenta de un cliente → no, salvo un caso

Hay dos formas y cuestan órdenes de magnitud distintos:

**(a) El vendedor arma el pedido en la app** → `draftOrderCreate` por Admin API →
le llega al cliente. **Nunca toca el storefront.** Es exactamente lo que este
repo ya hace por debajo (`buildDraftOrderInput()` en `app/lib/draft-order.js`);
la app puede hacer lo mismo sin Hydrogen.

**(b) El vendedor navega el storefront "como" el cliente** → necesita
autenticación de vendedor, listado de companies y contexto suplantado. El backlog
ya la marcó como **la épica más cara del set** y la decidió como demo visual.

Hoy el "modo vendedor" de este repo es **una cookie que escribe el cliente**.
Está documentado en `app/lib/draft-order.js` y **falla cerrado**: con
`DEMO_ROLE_SWITCHER` en `false` no se acepta ningún descuento. O sea: **no hay
camino a producción con descuentos de vendedor sin autenticación real**, y eso es
trabajo pendiente en cualquier escenario.

El único argumento técnico a favor de (b): `@inContext(buyer:)` de la Storefront
API es la forma nativa de ver el precio real del catálogo B2B del cliente sin
recalcularlo. Pero eso depende de que el cliente **tenga** catálogos B2B
configurados, y no todos los van a tener (§8, V4).

### 2.3 "Mis pedidos recientes" → el hueco no es el que parece

Los themes Liquid **sí** tienen historial de órdenes. Lo que no tienen es:

1. **Los presupuestos.** Un draft order **no es una orden** y no aparece en el
   historial de ningún theme. Este repo los muestra en `/account/quotes` leyendo
   la Customer Account API.
2. **Recomprar desde un pedido** — cargar 25 líneas con un click.

Los dos se resuelven con **App Proxy renderizado por la app**, que ya tiene Admin
API y ve draft orders y órdenes sin restricción. Es más barato que un storefront
headless.

Matiz a favor del storefront: con **customer accounts nuevos** —hospedados por
Shopify— la personalización de esas pantallas es limitada. Cuál usa cada cliente
hay que mirarlo caso por caso (§8, V7). Empuja hacia App Proxy o hacia un
storefront propio, pero no decide por sí solo.

### 2.4 Conclusión

> Tomados uno por uno, **los tres huecos no justifican Hydrogen**. Se resuelven
> con la app propia más App Proxy y app blocks.
>
> Lo que sí puede justificarlo es querer que la **experiencia de compra** sea un
> producto uniforme y no N themes adaptados.

---

## 2.5 Las limitaciones funcionales de Liquid, concretas

Conviene separar **lo que Liquid no puede** de **lo que Liquid hace incómodo**.
Lo segundo se resuelve con trabajo; lo primero decide la plataforma.

### Lo que Liquid no puede

**1. Llamar a tu API mientras renderiza.** Liquid se ejecuta en los servidores de
Shopify con los datos que Shopify le da. No hay forma de hacer un fetch a tu app
durante el render de un template. Es _la_ limitación de la que se derivan casi
todas las demás.

Las salidas son tres, y ninguna es gratis:

- **Metafields**: tu app escribe en Shopify _antes_, Liquid lee. Sirve para datos
  precalculados y estables. No sirve para algo que depende del cliente logueado
  cruzado con el producto, porque la cantidad de combinaciones explota.
- **App Proxy**: Shopify reenvía `/apps/loquesea` a tu servidor y vos devolvés
  HTML o JSON. Sirve para **pantallas enteras** —un historial, un portal— pero no
  para inyectar un dato dentro de una plantilla existente.
- **JavaScript en el navegador**: el cliente le pega a tu API después de cargar.
  Sirve para cosas no sensibles. **No sirve para precios**: lo que se calcula en
  el navegador es visible y manipulable, y el HTML ya salió sin el dato.

**2. Cambiar un precio que Shopify no conoce.** Liquid muestra `product.price`.
Si tu regla de descuento no está expresada como precio de Shopify —catálogo B2B,
lista de precios— Liquid no la puede aplicar del lado del servidor. Y aunque la
"mostraras" con JavaScript, **el checkout cobraría otra cosa**.

**3. Tener un actor que no sea el cliente logueado.** La sesión de un theme es la
del customer de Shopify. No hay lugar para "vendedor operando a nombre de un
cliente": ni la sesión, ni el cambio de contexto, ni los permisos.

**4. Modificar precios línea por línea en el carrito.** El carrito es el de
Shopify. Se pueden agregar atributos de línea, pero no cambiar el precio sin
Shopify Functions.

**5. Tener un catálogo mayorista que el retail no vea.** Liquid corre en el canal
**Online Store**, y la visibilidad de un producto se decide **por canal**, no por
plantilla. Un producto publicado en el Online Store es alcanzable por cualquiera:
por URL directa, por `/search` del theme, por las colecciones y por el sitemap.
Los catálogos B2B controlan **qué ve y a qué precio una company**, pero no borran
al producto de la vidriera pública del mismo canal.

Esconderlo es posible y es artesanal: excluir por tag en cada colección,
intervenir la plantilla de búsqueda, tapar la ficha. Son cuatro superficies
distintas y alcanza con que falle una —o con que el merchant cambie de theme—
para que un pack mayorista aparezca en el buscador público.

Un storefront Hydrogen, en cambio, **es otro canal de venta**: lo que se publica
ahí sencillamente no existe en el Online Store. La separación es estructural, no
configuración que hay que sostener.

⚠️ **Verificar antes de usar esto como argumento:** si un producto despublicado
del Online Store sigue siendo visible y comprable para una company con catálogo
B2B asignado, esta limitación se relaja mucho. Es la verificación que más
cambia la decisión y no está hecha.

### Lo que Liquid hace incómodo, pero puede

- **Gating de precios por cliente**: se hace con tags de customer y condicionales.
  Funciona, pero queda repartido por secciones del theme y se rompe cuando el
  merchant edita.
- **Historial y presupuestos**: nativo para órdenes; los draft orders necesitan
  App Proxy.
- **Flujos propios** (compra rápida, nota de pedido): son secciones a medida por
  theme.

### Lo que Liquid hace mejor que Hydrogen

Hay que decirlo, porque es real y pesa:

- **Cero puesta en marcha.** Ni deploy, ni subdominio, ni variables por cliente.
  Ojo: esto **no** es un ahorro de hosting —ver la nota de abajo—, es un ahorro
  de configuración y de fricción de venta.
- **El merchant edita solo**, desde el theme editor, sin pasar por ustedes.
- **Se distribuye por el ecosistema de Shopify**: app + app blocks se instalan en
  cualquier theme.
- **SEO y performance de fábrica**, servidos desde el CDN de Shopify.
- **No hay que mantener un frontend.** Este es el punto fuerte de verdad:
  Shopify pone al día el storefront. Un Hydrogen propio arrastra versiones de
  Storefront API y del framework, en cada cliente instalado, todos los años.

> **Corrección: Hydrogen no implica pagar servidores.** Shopify incluye **Oxygen**
> sin costo extra en todos los planes pagos salvo Starter y Agentic, y corre sobre
> la red de Cloudflare. El portal se aloja en el plan que el cliente **ya paga**:
> no hay factura nueva, ni servidores propios, ni guardia de disponibilidad —esa
> es de Shopify, igual que la del theme. Lo que sí queda del lado de ustedes es la
> **puesta en marcha por cliente** (crear el storefront, apuntar el subdominio,
> cargar credenciales) y el **mantenimiento del código**. Cuando se compare costo,
> comparar eso, no hosting.

### La pregunta que decide, y no es la de los vendedores

Todo lo anterior converge en una sola:

> **¿Los descuentos del negocio se pueden expresar como precios de Shopify?**

- **Sí** —los acuerdos entran en catálogos B2B y listas de precio— entonces
  Shopify calcula, Liquid muestra, el checkout coincide y **no hace falta
  Hydrogen para vender**. El vendedor y el historial se resuelven con la app.
- **No** —las reglas son demasiado dinámicas o combinatorias para precalcularlas—
  entonces Liquid no puede mostrar el precio correcto del lado del servidor, el
  checkout tampoco lo cobraría, y hay que ir a **presupuesto → draft order**. Ahí
  Hydrogen deja de ser una preferencia y pasa a ser el camino natural, porque es
  donde se pueden leer las reglas del servidor sin exponerlas.

Por eso esta pregunta está antes que la del portal de vendedores: **el modelo de
descuentos decide la plataforma**, no el organigrama comercial.

---

## 3. Dónde Hydrogen sí gana

No opiniones: lo que ya está construido acá y sería trabajo **por cliente** en el
escenario Liquid.

**Gating de precios del lado del servidor.** `app/lib/price-gating.server.js`,
aplicado en los loaders. Lo que lo motivó, medido: **320 importes viajando en el
HTML de `/collections/all` a un invitado** — la lista de precios mayorista
completa, publicada, mientras la UI decía "Precio para clientes aprobados". En
Liquid ese gate es un `{% if %}` por sección, y se rompe cada vez que el merchant
toca el theme.

**La cadena de descuentos con origen.** `app/lib/discounts.js` modela el
descuento como lista con origen, no como número, porque en B2B el comprador
pregunta de dónde sale cada punto. Configurable por tienda vía `DISCOUNT_SLOTS`.

**El presupuesto como flujo propio** — drawer, `/presupuesto`, pedido mínimo, PO,
listas de reposición, compra rápida por SKU. Nada de eso existe en un theme.

**Escalas de diseño verificadas por el gate.** `DESIGN.md` +
`scripts/check-design-tokens.mjs`. La deuda bajó de ~470 valores fuera de escala
a ~100 y **dejó de crecer**. En el escenario Liquid eso es justamente lo que no
se puede garantizar: el bloque hereda el CSS del theme del cliente.

**Ya está cerca de ser plantilla.** País, moneda, idiomas, descuentos, carrito y
pedido mínimo salen de `app/lib/const.js`; nombre, logo y descripción salen de
Shopify.

---

## 4. El criterio técnico que no se negocia

Para decidir de qué lado va una pantalla cualquiera, una sola regla:

> **La superficie donde el precio final lo fija alguien que no es Shopify tiene
> que terminar en draft order. La superficie donde el precio lo fija Shopify
> puede terminar en checkout.**

| Superficie  | Quién fija el precio | Termina en         | ¿Reglas fuera de Shopify?               |
| ----------- | -------------------- | ------------------ | --------------------------------------- |
| Presupuesto | nosotros / la app    | `draftOrderCreate` | **Sí.** Funciona hoy, sin catálogos B2B |
| Carrito     | Shopify              | checkout           | **No**, salvo catálogos B2B o Functions |

Por eso el presupuesto es la superficie natural para las reglas propias: el draft
order acepta el precio que le mandamos y un humano lo revisa. El carrito no.

**Consecuencia operativa, y es una trampa concreta:** hoy `ENABLE_CART = true` y
carrito y presupuesto conviven. Los descuentos de cliente y de categoría **no se
pueden aplicar a los precios del carrito** mientras no exista catálogo B2B o una
Discount Function: el checkout cobraría el precio de Shopify y el total mostrado
no coincidiría. Alguien va a querer "arreglar" esa inconsistencia aplicando los
descuentos al carrito. **Eso es el bug, no el arreglo.**

---

## 5. Escenarios de convivencia

**No decidido.** Se plantean con sus consecuencias.

- **E1 · Liquid único** — app + app blocks. Este repo se archiva o queda como
  prototipo de UX.
- **E2 · Hydrogen único** — el portal reemplaza al theme.
- **E3 · Híbrido con subdominio** — theme Liquid público (marketing, SEO, retail)
  - Hydrogen en `b2b.cliente.com` para la zona mayorista. Es el escenario donde
    el argumento de portabilidad de §7 pega más fuerte.

| Eje                  | E1 Liquid    | E2 Hydrogen        | E3 Híbrido                         |
| -------------------- | ------------ | ------------------ | ---------------------------------- |
| Sesión del comprador | una          | una                | **¿se loguea dos veces?** ← V7     |
| Carrito              | uno          | uno                | **¿dos carritos?** ← V8            |
| Checkout             | Shopify      | Shopify            | Shopify                            |
| Coherencia visual    | la del theme | la del portal      | **dos sistemas de diseño** (§7)    |
| SEO                  | del theme    | del portal         | partido; hay que definir canónicas |
| El merchant edita    | sí           | no                 | según la zona                      |
| Deploy               | app          | Oxygen por cliente | los dos                            |

---

## 6. Costo de onboarding del cliente #5

Pasos reales, no estimaciones.

**E1 · Liquid.** Instalar la app → configurar vendedores, listas y descuentos en
la app → soltar los app blocks desde el theme editor. **Cero deploys, cero infra,
cero env vars, cero dominios.** El costo variable —y es el que no baja con la
escala— es **adaptar los bloques al theme de cada cliente**: CSS heredado,
layout, tipografía.

**E2 · Hydrogen.** Crear el storefront y el canal headless → **10 variables de
entorno** (las lista `.env.example`) → app de Customer Accounts con las callback
URLs del dominio nuevo → deploy de Oxygen con su token de CI → dominio → tokens
de marca en `app/styles/_app.scss` → el bloque de configuración de
`app/lib/const.js` → los metafields del catálogo en `app/data/metafields.js`.

Es **costo fijo por cliente**, y baja con cada cliente **solo si** se contesta la
pregunta que este escenario obliga a hacerse: **¿un repo por cliente, o un repo
con configuración por cliente?** Un fork por cliente hace que el arreglo del
cliente 2 no llegue al 5. Es la decisión más cara de E2 y está abierta (§12).

**E3 · Híbrido.** Los dos, más lo de §7.

---

## 7. El subdominio, y por qué cambia el cálculo

Hay un argumento a favor de Hydrogen que pesa más que todos los técnicos juntos,
y es de **portabilidad del trabajo**:

> **Lo que se construye dentro del theme de un cliente no se lleva a otro
> cliente.** Un portal en `b2b.cliente.com` sí.

Es la diferencia entre un trabajo que se rehace por cliente y un trabajo que se
hace una vez. Un app block vive dentro de un theme ajeno: hereda su CSS, su
tipografía, su layout y sus scripts. Cada cliente nuevo es volver a pelear esa
integración, y **ese costo no baja con la escala** — el cliente 20 cuesta como el
cliente 2. Un subdominio no hereda nada: el portal se ve igual en todos lados y
lo único que cambia son los tokens de marca.

Y el subdominio desactiva casi todas las objeciones que suelen hacérsele al
híbrido:

| Objeción al híbrido           | Con `b2b.cliente.com`                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Se ve distinto de la tienda" | **Deja de ser un defecto.** Es un portal privado: que se vea distinto _señala_ que entraste a la zona mayorista — que es el objetivo de diseño de este proyecto |
| "Parte el SEO"                | **Desaparece.** Un portal detrás de login va `noindex`: no hay SEO que partir                                                                                   |
| "Dos sistemas de diseño"      | Se reduce: el theme público es del cliente y no lo tocás; el portal es tuyo y es uno solo                                                                       |
| "El merchant no puede editar" | Sigue siendo cierto, pero **importa menos**: el contenido editable vive en la tienda pública, no en el portal                                                   |

### Lo que el subdominio NO resuelve

Hay que decirlo, porque son costos reales y no desaparecen:

- **Puesta en marcha por cliente.** Crear el storefront, un dominio con su DNS,
  variables de entorno y una app de Customer Accounts con las callback URLs de
  ese dominio. **No es hosting** —eso lo pone Oxygen, incluido en el plan del
  cliente— sino configuración: costo fijo por cliente, pero **repetible**, a
  diferencia de adaptar un theme, que es artesanal.
- **El mantenimiento del frontend, para siempre.** Es el costo que de verdad no
  desaparece: versiones de Storefront API que Shopify deprecia, versiones de
  Hydrogen y Remix, y hacerlo en cada cliente instalado. En un theme eso lo hace
  Shopify. Si el modelo comercial no lo contempla en el precio, se come el margen.
- **Sesión separada.** `b2b.cliente.com` es otro origen que `cliente.com`. Un
  comprador logueado en la tienda pública no queda logueado en el portal. Para un
  portal mayorista suele dar igual —el comprador entra directo al portal— pero
  hay que confirmarlo con el flujo real (§8, V7).
- **Carrito separado**, si las dos superficies venden. Si el mayorista compra
  solo en el portal, no es problema (§8, V8).

### El balance

El argumento del subdominio **matiza la conclusión de §6** para el caso de un
producto replicable: en app blocks, el costo variable por cliente es artesanal y
no baja; en subdominio, el costo por cliente es de configuración y sí baja. La
pregunta pasa a ser **cuántos clientes** justifican asumir el mantenimiento de un
frontend propio para dejar de pagar la artesanía por cliente.

Con pocos clientes y themes parecidos, app blocks gana. Con muchos clientes o
themes muy distintos entre sí, el subdominio gana — y gana cada vez más.

**Hasta dónde llega este argumento.** Es de grado, no estructural, y conviene no
apoyarse solo en él: un app block escrito con CSS bien acotado y sin depender del
layout del theme puede ser bastante portable, y del otro lado un portal por
cliente también tiene su puesta en marcha. La portabilidad inclina la balanza
cuando hay muchos clientes; **no la decide sola**. El argumento estructural —el
que no admite grados— es el del canal de venta separado (§2.5, punto 5): ahí
Liquid no puede, no es que le cueste más.

---

## 8. Quién posee cada dato

| Dato                     | Dueño hoy                   | Dueño propuesto                       | Verificar |
| ------------------------ | --------------------------- | ------------------------------------- | --------- |
| Catálogo, precios, stock | Shopify                     | Shopify                               | —         |
| Vendedores               | app propia                  | **app propia** — Shopify no lo modela | V2        |
| Clientes de un vendedor  | app propia                  | **app propia**                        | V2        |
| Descuento por cliente    | según el cliente            | app propia, o catálogo B2B            | V4        |
| Descuento por categoría  | según el cliente            | app propia                            | **V5**    |
| Auditoría de descuentos  | **nadie**                   | **app propia** — Shopify no lo guarda | —         |
| Empresas y sucursales    | Shopify                     | Shopify                               | V4        |
| Presupuesto emitido      | Shopify (draft order)       | Shopify                               | —         |
| Presupuesto en borrador  | **cookie del navegador** ⚠️ | servidor o cart de Shopify            | —         |
| Categoría de un producto | según el cliente            | configuración de la plantilla         | **V5**    |
| Órdenes                  | Shopify                     | Shopify                               | —         |
| Listas de reposición     | localStorage                | metafield de customer o app propia    | —         |

**Sobre el borrador:** el backlog lo mide — **~395 bytes por línea, techo ~10
líneas** antes de que el navegador descarte la cookie **en silencio**. Un pedido
mayorista real tiene 20 o 30. La cookie es el almacenamiento equivocado, y eso es
**independiente del escenario que se elija**.

**Si la app entra en el camino crítico del loader**, el contrato tiene que
incluir: latencia máxima, comportamiento ante caída (**fail-closed: sin
descuentos, nunca un descuento inventado**), autenticación, y si la respuesta es
cacheable por company.

### Lo que hay que verificar, por cliente

⚠️ **Esto es una plantilla.** Nada de lo que se verifique en una tienda vale como
regla del producto: cada cliente llega con su catálogo, su configuración y sus
acuerdos. Lo que sigue son las preguntas que hay que hacerse **en cada
implementación**, y al lado, como ejemplo, lo que dio la tienda de demo — que
sirve para saber **qué no puede asumir la plantilla**, no para decidir por todos.

| #   | Pregunta, por cliente                                                                               | Qué enseñó la tienda de demo                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | ¿Conserva su theme, o recibe el portal?                                                             | —                                                                                                                                    |
| V2  | ¿La app ya tiene UI de vendedores, o solo backend?                                                  | —                                                                                                                                    |
| V3  | ¿Hay App Proxy? ¿Qué endpoints, latencia, límites?                                                  | —                                                                                                                                    |
| V4  | ¿B2B habilitado y catálogos configurados?                                                           | Sin catálogos: 0 de 163 variantes con quiebres. **La plantilla tiene que verse bien sin ellos**                                      |
| V5  | ¿De dónde sale la "categoría" de un producto?                                                       | `productType` vacío en los 44. **No se puede asumir `productType`**                                                                  |
| V6  | ¿Los precios vienen con IVA incluido?                                                               | Sin confirmar; por eso `ESTIMATED_TAX_RATE` está apagado                                                                             |
| V7  | ¿Customer accounts classic o nuevos?                                                                | Nuevos. Cambia qué se puede personalizar en Liquid                                                                                   |
| V8  | ¿El carrito de Liquid y el de Storefront API son el mismo?                                          | Sin verificar; si no lo son, el híbrido tiene dos carritos                                                                           |
| V9  | ¿Hay producto que el mayorista compra y el retail no debe ver?                                      | Sin definir. Si lo hay, §2.5 punto 5 pasa a ser el criterio principal                                                                |
| V10 | ¿Un producto despublicado del Online Store sigue siendo comprable por una company con catálogo B2B? | **Sin verificar, y es la que más cambia la decisión.** Si la respuesta es sí, Liquid puede separar canales y V9 deja de ser decisivo |

**Consecuencias para el diseño de la plantilla**, que sí son generales:

- **La fuente de la categoría es configuración, no una constante.** Puede ser
  `productType`, el handle de una colección, un metafield o una taxonomía propia.
  La plantilla no puede tener una favorita.
- **Un producto puede estar en varias categorías con descuento.** Pasa seguido —
  en la tienda de demo, 23 de 44 productos están en 2 o más colecciones. La regla
  de desempate (¿gana el mayor, el menor, se encadenan?) es **decisión de
  negocio por cliente** y cambia lo que se cobra.
- **Sin catálogos B2B configurados, todo lo que dependa de ellos tiene que
  degradar en silencio**, no romper ni mostrar una tabla vacía. Ya es así:
  quiebres y reglas de cantidad no renderizan si no hay datos.

---

## 9. Puntos de integración en este código

Si se elige Hydrogen o híbrido, la app propia entra por acá y por ningún otro
lado.

| Punto                              | Archivo · función                                              | Qué entra                                               |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Puerta única de datos por request  | `app/lib/context.js` · `createAppLoadContext()`                | Ya lo hace con `getB2BContext()`. Ahí va el resto       |
| Patrón a copiar                    | `app/lib/b2b.server.js` · `getB2BContext()`                    | **Nunca lanza.** Una API caída no puede tumbar el sitio |
| Gate de lo que baja al cliente     | `app/lib/price-gating.server.js`                               | Los descuentos pasan por el mismo gate que los precios  |
| Entrada de la cadena de descuentos | `app/lib/discounts.js` · `resolveLineDiscounts(item, context)` | Ese `context` **es** el contrato con la app             |
| Frontera de plata                  | `app/lib/draft-order.js` · `canApplyRepDiscounts()`            | Acá entra el token real de vendedor                     |
| Configuración de tienda            | `app/lib/const.js` (bloque de arriba)                          | Slots, modo de acumulación, topes                       |
| Lo que baja al navegador           | `app/root.jsx` · `loadCriticalData()`                          | —                                                       |
| Providers                          | `app/components/PageLayout/PageLayout.jsx`                     | —                                                       |

**Hoy este storefront no habla con la app propia**: la única mención a
`powerb2x.com` es un link del footer. La integración es terreno virgen, no una
migración.

---

## 10. Qué NO conviene mover a Hydrogen

- **El checkout.** Es de Shopify. No se discute.
- **El admin de vendedores, listas y descuentos.** Es back-office, va en la app.
- **Las páginas de marketing que el merchant edita solo.** El theme editor le
  gana a un deploy, siempre.
- **Facturación, remitos, historial contable.** Admin API desde la app.
- **Todo lo que la app ya resuelve y funciona.** Reescribirlo es costo puro.

---

## 11. Qué falta para que este repo sea plantilla

Lo que `AGENTS.md` ya lista, más lo que apareció acá:

- `app/data/metafields.js` describe el catálogo del vertical de iluminación del
  fork. Los metafields que lee el storefront son de cada tienda.
- `MINIMUM_ORDER_AMOUNT` es un valor de demo en pesos.
- **La fuente de la categoría de producto no es configurable todavía** — hace
  falta que lo sea antes de que los descuentos por categoría funcionen en más de
  una tienda.
- Los tokens de marca se copian a mano del theme del cliente (§7).
- Falta decidir **repo por cliente vs. configuración por cliente** (§6).

---

## 12. Decisiones abiertas

Esta es la tabla que se actualiza. El resto del documento no debería cambiar cada
semana.

| Decisión                                       | Quién decide | Consecuencia si se posterga                           |
| ---------------------------------------------- | ------------ | ----------------------------------------------------- |
| **V1 — ¿su theme o el portal?**                | negocio      | Bloquea todo lo demás                                 |
| Repo por cliente vs. configuración por cliente | equipo       | Un fork por cliente no propaga arreglos               |
| Cascada vs. suma (`DISCOUNT_STACK_MODE`)       | negocio      | Cambia lo que se cobra: 10+10 da 19% o 20%            |
| Tope por línea (`MAX_LINE_DISCOUNT`, hoy 30%)  | negocio      | Sin techo, un 90 donde iba un 9 regala el catálogo    |
| Desempate de categoría con 2+ colecciones      | negocio      | Pasa seguido; sin regla, el descuento es impredecible |
| IVA (`ESTIMATED_TAX_RATE`)                     | negocio      | El desglose queda apagado                             |
| Autenticación real de vendedor                 | equipo       | Sin ella no hay descuentos de vendedor en producción  |
| Dónde vive el presupuesto en borrador          | equipo       | La cookie pierde el pedido a las ~10 líneas           |
