---
title: Ítems, precios y stock
sidebar_label: Ítems, precios y stock
sidebar_position: 5
---

El catálogo de Roplex es un espejo de Zauru. El checkout no acepta `unit_price` del cliente.

## Cómo se arman las líneas

El handler recorre las claves que empiezan por `item` y luego las que empiezan por `quantity`. Para cada `quantity…` busca la clave `item…` con el mismo sufijo (`quantity` → `item`, `quantity1` → `item1`).

- Valor numérico: id de `items`.
- Valor `b` + número: id de `bundles` (se le quita la `b` para buscar).

Hace falta al menos una clave `item*`. Si no hay ninguna: HTTP 400 `Debe enviar al menos un item o bundle para crear la orden`.

Los documentos se cargan con `depth: 2` y sin join de `suggested_prices` en el find inicial de catálogo; el precio se toma de `suggested_prices.docs` ya relacionados en el documento.

## Precio

La lista de precios es la `price_list` de `sites.ecommerce_agency`. Para cada línea se busca un `suggested_prices` que esté `current` y cuya `price_list` sea esa lista.

Si no hay precio: HTTP 400 con el nombre, código e id del ítem o bundle, y `user_message` pidiendo contactar al administrador.

`unit_price` de la línea = `suggested_prices.amount` (después de conversión). `subtotal` = cantidad × ese amount (antes de redondear la conversión).

## Moneda de cobro

`currency_id` del body, si existe, debe existir en `currencies`. Si se omite, se usa la moneda de la entidad (`entities.currency`).

Si la moneda del precio sugerido es distinta a la de cobro, se convierte con `exchange_rates` de la entidad (tasa directa `currency_id → currency_exchange_id`, o inversa `1/tasa`). El monto se redondea a 2 decimales. Esa conversión se anota en el memo de la orden (`buildItemsConversionMemo`).

Si falta la tasa de un ítem, el handler deja el monto original (no falla en ese paso). El total de la orden es la suma de `unit_price * quantity` de las líneas ya convertidas, más el envío si aplica. Si ese total es `NaN`, HTTP 400.

## Stock

Por defecto se valida existencias en agencias ecommerce (`available + incoming` del espejo `stocks`):

- Ítem no `stockable` o `manufacturable`: no se valida.
- `total_stock === -1`: ilimitado (servicios / bundles solo de servicios); se omite.
- Si `quantity` > `total_stock`: HTTP 400 `No hay suficiente stock para el item|bundle … maximo disponible N`.

Un bundle usa el mínimo de paquetes completos a partir de componentes stockables.

Si el sitio tiene `skip_stock_validation`, esta consulta no corre. El listado GraphQL de la tienda sigue filtrando por stock; solo el checkout deja de rechazar.

Roplex no descuenta inventario. El movimiento lo hace Zauru al procesar `ecommerce_requests`.
