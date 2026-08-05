# Guion de demo — Picafili mayorista

Recorrido de 5 minutos para mostrar la zona B2B. Verificado en local; la demo abre en castellano
(`/es` es el locale por defecto).

## Antes de empezar

1. `ADMIN_API_ACCESS_TOKEN` tiene que estar en el `.env` (aunque sea un placeholder) o el sitio
   entero tira 500. Ver `AGENTS.md` → Operación.
2. `npm run dev` — si el 3000 está ocupado, `npm run dev -- --port 3100`.
3. El switcher **"Ver como"** de la barra superior es la herramienta de demo: cambia el estado de
   cuenta sin necesidad de companies reales en Shopify. Se apaga con `DEMO_ROLE_SWITCHER` en
   `app/lib/const.js` antes de mostrar esto a un usuario final.
4. Empezá en **Invitado** y con el presupuesto vacío (borrá la cookie `quoteItems` si quedó algo).

## El recorrido

### 1. Invitado — "hay algo acá adentro que no estás viendo"

`/es/collections/all`

- Banner crema: _"Estás viendo el catálogo público"_ + CTA **Quiero ser mayorista**.
- Cada tarjeta muestra SKU y disponibilidad, y 🔒 **Precio para clientes aprobados** en el lugar
  del precio.
- En la ficha, los botones son **Iniciar sesión** y **Consultar**: no hay forma de armar un pedido.
- El acceso a Compra rápida no está en el menú.

> El punto a subrayar: el privilegio no se comunica con un sello, se comunica mostrando el hueco
> donde iría el precio.

### 2. Registrado (pendiente) — "ya entraste, falta que te habiliten"

Cambiar a **Registrado (pendiente)**.

- El banner pasa a ámbar: _"Tu cuenta está pendiente de aprobación… Te avisamos por email."_
- Los precios siguen bloqueados y el presupuesto **no existe**: ni barra inferior ni ícono.
- Es el estado que hoy resuelve el equipo comercial a mano; acá queda explícito para el comprador.

### 3. Cliente aprobado — la zona privilegiada

Cambiar a **Cliente aprobado**.

- Banner verde: **Distribuidora El Sol · grupo mayorista-estandar**. El nombre del grupo de precios
  es lo que más comunica pertenencia con menos código.
- Aparecen los precios con el de lista tachado, y **⚡ Compra rápida** en el menú.
- Ficha de producto: galería con miniaturas laterales y contador, SKU, Material (atributo real del
  catálogo) y el bloque **Configurá tu pedido** con cantidad siempre visible — se elige cantidad y se
  agrega en un gesto, sin descubrir el selector después.

### 4. Compra rápida — donde se compra de verdad

`/es/compra-rapida`

- Abre con el catálogo cargado: una pantalla de quick order que arranca vacía obliga a adivinar qué
  escribir. Buscar por nombre o SKU acota.
- Filtros por **Color** y **Material**, que salen de lo que la tienda declara en Shopify: si mañana
  agregan uno, aparece solo. Se combinan entre sí.
- Aviso honesto de truncado: _"24 resultados de 44 — mostramos los primeros 24"_.
- **Descargar cotización (CSV)** — sin cuenta aprobada el CSV sale sin columnas de precio.
- Agregar dos o tres ítems y mirar la barra inferior (ancho completo, alineada al contenedor del
  header): cantidad, total y _"Pedido mínimo ARS 150.000 · te faltan ARS X"_. **Avisa, no bloquea** —
  el equipo comercial decide.
- Abrir el presupuesto: filas compactas con nombre, SKU, cantidad y **total de línea**, y pie fijo
  con total, email y envío. Un pedido mayorista tiene 15 líneas, no 2.

### 5. Modo vendedor — el cierre

Cambiar a **Vendedor**.

- Barra permanente: **MODO VENDEDOR · Comprando para: Distribuidora El Sol · mayorista-plus**.
- El banner cambia de grupo de precios (`mayorista-plus` en vez de `mayorista-estandar`): se ve que
  el precio depende de la cuenta, no del producto.

> **Decir en voz alta que esto es maqueta.** No hay auth de vendedor ni contexto suplantado real
> (decisión de negocio, E14 del backlog). Venderlo como funcional cuesta tres veces más después.

## Qué NO mostrar

- `/account/*` — necesita túnel con dominio público para el login de Customer Account API.
- Los tier prices por cantidad (E4) y las quantity rules (E5): dependen de B2B habilitado en la
  tienda, todavía sin confirmar.
- El stock real por unidad: el token de Storefront no tiene el scope de inventario, así que el badge
  es binario.
- El menú **Product Page** apunta a un handle que no existe en Picafili: da 404 (limpio, no 500),
  pero mejor no clickearlo. Se corrige en el menú de Shopify, no en el código.
- La columna **Descargas** del configurador: no hay fichas técnicas cargadas en este catálogo, así que
  el ícono no lleva a nada.

## Si preguntan "¿esto es Shopify nativo o hecho a mano?"

- **Nativo, apenas se habilite B2B:** precios por company, tier prices, quantity rules, net terms.
- **Construido acá:** la máquina de estados de cuenta, Compra rápida, la nota de pedido con mínimo
  y el CSV.
- **Maqueta:** modo vendedor.
