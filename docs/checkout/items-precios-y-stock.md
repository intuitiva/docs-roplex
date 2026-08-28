---
title: Ítems, precios y stock
sidebar_label: Ítems, precios y stock
sidebar_position: 5
---

El catálogo de Roplex es un espejo de Zauru. La tienda envía qué se compra y cuánto, nunca a qué precio: **el checkout ignora cualquier precio que venga en el body** y toma el suyo de la lista de precios configurada en el sitio.

## Cómo se arman las líneas

Las líneas no viajan en un arreglo. Van emparejadas por sufijo: cada clave `quantity…` se empareja con la clave `item…` que tiene el mismo sufijo.

| Clave de ítem | Clave de cantidad |
|---|---|
| `item` | `quantity` |
| `item1` | `quantity1` |
| `item2` | `quantity2` |

El valor de cada clave `item*` puede ser:

- Un número: id de un ítem del catálogo.
- La letra `b` seguida de un número: id de un paquete. Por ejemplo `b12`.

Cualquier otro formato devuelve HTTP 400. Hace falta al menos una clave `item*`; si no hay ninguna, la respuesta es HTTP 400 con `Debe enviar al menos un item o bundle para crear la orden`.

Los ids son los de Roplex, que coinciden con los de Zauru. No son SKUs libres. Obténgalos del catálogo GraphQL, donde los paquetes ya vienen con el prefijo `b`.

## Precio

El precio de cada línea sale del precio sugerido **vigente** de la lista de precios de la agencia configurada en **Agencia de Ecommerce** del sitio.

Si un ítem o paquete no tiene precio vigente en esa lista, la orden se rechaza con HTTP 400. El mensaje incluye el nombre, el código y el id del ítem, y el `user_message` pide contactar al administrador de la tienda.

El campo `unit_price` de la línea es ese precio ya convertido a la moneda de cobro, y el subtotal es la cantidad multiplicada por él.

## Moneda de cobro

Si el body trae `currency_id`, esa moneda debe existir; si no, HTTP 400. Si se omite, se usa la moneda de la entidad.

Cuando el precio sugerido está en una moneda distinta a la de cobro, Roplex lo convierte usando las **Tasas de Cambio** de la entidad, en el grupo **Management** del menú. Sirve tanto la tasa directa como la inversa. El monto se redondea a dos decimales y la conversión se anota en el memo de la orden.

Si falta la tasa para un ítem, ese ítem conserva su monto original en lugar de fallar. El total de la orden es la suma de las líneas ya convertidas, más el envío si aplica. Si ese total no resulta en un número válido, la respuesta es HTTP 400.

> **Nota:** las pasarelas de tarjeta sí fallan sin tasa de cambio, porque cobran en una moneda fija. Ver [Pasarelas de pago](/checkout/pasarelas-de-pago).

## Stock

Por defecto el checkout valida existencias contra el stock espejado de las agencias de ecommerce, sumando lo disponible más lo que está por entrar.

| Caso | Comportamiento |
|---|---|
| El ítem no maneja inventario ni es manufacturable | No se valida |
| El stock del ítem es ilimitado, como en servicios | No se valida |
| La cantidad pedida supera el stock | HTTP 400 con `No hay suficiente stock para el item\|bundle … maximo disponible N` |

Un paquete se mide por la cantidad de paquetes completos que alcanzan sus componentes inventariables.

Si el sitio tiene activo **Omitir validación de existencias en el checkout**, esta validación no corre y la orden se crea igual. El listado de catálogo no cambia: solo deja de rechazar el checkout.

**Roplex no descuenta inventario.** El movimiento lo hace Zauru al procesar la orden. Ver [Sincronización con Zauru](/checkout/sincronizacion-con-zauru).

## Troubleshooting

**HTTP 400 pidiendo contactar al administrador por un ítem concreto**
Ese ítem no tiene precio vigente en la lista de precios de la agencia del sitio. Es configuración en Zauru y en el sitio, no un problema del request.

**HTTP 400 `Debe enviar al menos un item o bundle para crear la orden`**
No llegó ninguna clave que empiece por `item`. Revise que los sufijos de `item*` y `quantity*` coincidan exactamente.

**Un paquete se rechaza como ítem inválido**
El valor debe ser `b` seguida del id, sin espacios: `b12`, no `B12` ni `bundle12`.

**El total de la orden no cuadra con lo que muestra la tienda**
Compare la moneda: si `currency_id` difiere de la moneda del precio sugerido, el monto viene convertido y redondeado a dos decimales por línea.
