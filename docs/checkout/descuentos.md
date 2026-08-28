---
title: Descuentos
sidebar_label: Descuentos
sidebar_position: 7
---

El descuento extra del checkout es independiente de las gift cards y de las reglas de envío. Se calcula sobre el total de líneas —ítems más envío— y **antes** de aplicar gift cards.

## Requisito en el sitio

En la pestaña **Configuraciones de Zauru** del sitio, active el checkbox **Recibir descuento extra desde endpoint de ventas**. Viene apagado por defecto.

Con el checkbox apagado, `extra_discount_percent` y `extra_discount_amount` se ignoran y el descuento queda en 0. **No es un error**: la orden se crea sin descuento y sin aviso.

## Campos

Solo uno de los dos, nunca ambos:

| Campo | Tipo | Efecto |
|---|---|---|
| `extra_discount_percent` | number | Porcentaje sobre el total. El monto resultante se redondea a dos decimales. |
| `extra_discount_amount` | number | Monto fijo, redondeado a dos decimales. |

Un valor vacío o ausente equivale a no aplicar descuento.

## Rechazos

Todos devuelven HTTP 400, con el mismo texto en `message` y en `user_message`:

| Causa | Mensaje |
|---|---|
| Llegaron los dos campos | `Solo puede enviar extra_discount_percent o extra_discount_amount, no ambos.` |
| Porcentaje negativo | `El porcentaje de descuento extra no puede ser negativo.` |
| Monto negativo | `El monto de descuento extra no puede ser negativo.` |
| El descuento supera el total | `El descuento extra no puede ser mayor al total de la orden. El total no puede quedar negativo.` |

## Efecto sobre el cobro

El monto calculado se guarda en la orden y se resta del total antes de cualquier cobro:

```text
neto a cobrar = total de líneas - descuento extra
```

Ese neto es el que cotizan las gift cards y, si queda un restante, el que cobra la pasarela o la transferencia.

El mismo monto viaja a Zauru y a los webhooks como `order.extra_discount`. Ver [Sincronización con Zauru](/checkout/sincronizacion-con-zauru).

## Troubleshooting

**El descuento no se aplicó y tampoco hubo error**
El sitio tiene apagado **Recibir descuento extra desde endpoint de ventas**. Actívelo en la pestaña **Configuraciones de Zauru**.

**HTTP 400 diciendo que el descuento supera el total**
El total incluye el envío. Si calculó el descuento solo sobre los ítems, puede quedar por debajo del total real y aun así superar el límite en casos con envío gratis.
