---
title: Gift cards
sidebar_label: Gift cards
sidebar_position: 8
---

El checkout acepta hasta dos GiftCards sincronizadas desde Zauru (`sales_gift_cards`). Se aplican después del descuento extra y antes de la pasarela o la transferencia.

## Requisitos del sitio

Hace falta sitio, `sites.token` y `skip_zauru_sync` **apagado**. Si no: HTTP 400, `code: GiftCardRequiresZauruSync`.

La redención local del saldo en Roplex solo corre si Zauru aceptó el `ecommerce_request`. Si el sync falla, el saldo local no se descuenta.

## Campos en create-ecommerce-order

- **gift_card_1_id_number**: código (`id_number`). Obligatorio si se usa la 2.
- **gift_card_2_id_number**: segunda tarjeta. No se puede enviar sola (`GiftCardPairingInvalid`). Debe ser distinta de la 1 (`GiftCardDuplicate`).
- **gift_card_1_discount** / **gift_card_2_discount**: tope opcional en **moneda de la orden**. Número ≥ 0. Si falta, se usa el máximo aplicable. Valor inválido → `GiftCardDiscountInvalid`.

Cada tarjeta se cotiza contra el restante (neto menos lo ya aplicado). El monto aplicado es el mínimo entre saldo convertido, tope pedido (si hay) y restante de la orden. Si el aplicable es 0, esa tarjeta se omite y se sigue con la siguiente.

Si el restante llega a 0, no se llama a la pasarela ni a transferencia. `orders.state` queda `paid`.

## Cotización previa

`POST /api/orders/gift-card-quote` (misma API key). Rate limit por usuario o IP; si se excede, HTTP 429 `GiftCardQuoteRateLimitExceeded`.

Campos del JSON:

- **gift_card_1_id_number** o **gift_card_code**: código.
- **gift_card_1_discount** o **requested_amount**: tope opcional.
- **order_total**: total a cubrir (opcional).
- **extra_discount_amount**: se resta de `order_total` antes de cotizar.
- **currency_id**: misma regla que el checkout.

La cotización no crea orden ni descuenta saldo.

## Estados de la tarjeta

La tarjeta debe existir en la entidad, no estar `voided`, estar `issued` y tener `current_balance` > 0. El tipo debe tener moneda. Si la moneda de la tarjeta y la de la orden difieren, hace falta `exchange_rates`.

Códigos frecuentes: `GiftCardNotFound` (404), `GiftCardVoided`, `GiftCardNotIssued`, `GiftCardWithoutBalance`, `GiftCardExchangeRateUnavailable`.

## Qué se guarda

En la orden: `gift_card_1_id_number`, `gift_card_2_id_number`, descuentos por slot y total. El memo incluye el desglose. La respuesta 200 trae el objeto `gift_card` con `applied_amount`, `remaining_to_charge` y el arreglo `cards`.
