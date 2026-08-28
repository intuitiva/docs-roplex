---
title: Envíos
sidebar_label: Envíos
sidebar_position: 6
---

El costo de envío no viene en el body. Lo calcula `calculateShippingCost` salvo que `store_pickup` sea `true`, `"true"` o `"1"`. En recolección en tienda no se añade línea de envío y el memo incluye `Recolección en tienda`.

La configuración vive en la entidad (`shipping_zones`, `shipping_methods`, `shipping_method_rules`), no en el sitio. El `site` solo filtra métodos: si el método tiene `sites` vacíos, aplica a todos; si tiene sitios, debe incluir el sitio actual.

## Campos del request que entran al cálculo

- **state**: id de `states`. Se carga el documento; el país sale de `state.country.code`.
- **city**: id numérico de `cities`, o nombre exacto (filtrado por estado si ya se resolvió).
- **postal_code**: contexto `destinationPostalCode`.
- **coupon**: contexto `couponCode`, para reglas `condition_type: "coupon"`.

`address_line_1` y `delivery_instructions` se guardan en la orden; no participan en la tarifa.

Si no hay zona para esa ubicación, el cálculo sigue con métodos activos de la entidad (fallback). Si no hay métodos activos con ítem, o ninguno aplica al sitio, el costo es `null` y la orden se crea **sin** línea de envío.

## Zonas

`shipping_zones.location` es un arreglo de filas país / estados / ciudades. Vacío en un nivel = todos de ese nivel. El destino coincide si el país (si está puesto), alguno de los estados (si hay lista) y alguna de las ciudades (si hay lista) cubren el destino.

## Métodos

Cada método activo debe tener un **item** de catálogo: servicio `active`, `stockable: false`, `sellable: true`. Ese ítem es la línea que se agrega a la orden (`quantity: 1`, `unit_price` = costo).

Tipos (`shipping_methods.type`): `flat_rate`, `by_weight`, `by_price`, `by_distance`, `carrier_api`. El costo efectivo lo ponen las **reglas**, no el tipo por sí solo.

## Reglas

Se evalúan por método, ordenadas por `priority` (menor número primero). La primera regla que cumple determina el costo y se deja de buscar.

Condiciones (`condition_type`): `min_price`, `max_price`, `min_weight`, `max_weight`, `distance`, `coupon`, `customer_group`.

Operadores: `EQUALS`, `LESS_THAN_OR_EQUAL_TO`, `GREATER_THAN_OR_EQUAL_TO`, `IN`, `BETWEEN`.

Acciones (`action_type`):

- **set_price**: `action_value` es el costo.
- **discount**: descuenta `action_value` de un precio base.
- **free**: costo 0.

Si ninguna regla de ningún método aplica, no hay línea de envío.

## Conversión

El costo puede estar en otra moneda. Se convierte a la moneda de cobro con las mismas `exchange_rates` de los ítems. Si no hay tasa, se usa el monto original y se deja un warning en log.

El peso del contexto suma `detail.weight * quantity`. Las líneas armadas en el checkout no rellenan `weight` hoy, así que `totalWeight` queda en 0 salvo que eso cambie en el mapper.
