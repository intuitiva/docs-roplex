---
title: Descuentos
sidebar_label: Descuentos
sidebar_position: 7
---

El descuento extra del checkout es independiente de GiftCard y de las reglas de envío. Se calcula sobre el total de líneas (ítems + envío) **antes** de GiftCard.

## Flag del sitio

`sites.accept_extra_discount_from_endpoint` (checkbox, default `false`).

Si está apagado, `extra_discount_percent` y `extra_discount_amount` se ignoran: el descuento es 0. No es error.

## Campos

Solo uno de los dos, nunca ambos:

- **extra_discount_percent**: porcentaje sobre el total. Se calcula `(orderTotal * percent) / 100` y se redondea a 2 decimales.
- **extra_discount_amount**: monto fijo, redondeado a 2 decimales.

Valores vacíos o ausentes = sin descuento extra.

## Rechazos (HTTP 400)

- Ambos campos presentes: `Solo puede enviar extra_discount_percent o extra_discount_amount, no ambos.`
- Porcentaje negativo: `El porcentaje de descuento extra no puede ser negativo.`
- Monto negativo: `El monto de descuento extra no puede ser negativo.`
- Descuento mayor que el total: `El descuento extra no puede ser mayor al total de la orden. El total no puede quedar negativo.`

El mensaje va en `message` y en `user_message`.

## Efecto

`orders.extra_discount` guarda el monto calculado. El neto a cobrar (antes de GiftCard) es `orderTotal - extraDiscount`, redondeado a 2 decimales. Ese neto es el que cotizan las GiftCards y, si queda restante, la pasarela o la transferencia.

El mismo monto se envía a Zauru/webhooks como `order.extra_discount`.
