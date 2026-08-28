---
title: Gift cards
sidebar_label: Gift cards
sidebar_position: 8
---

El checkout acepta hasta **dos** gift cards por orden. Se aplican después del descuento extra y antes de la pasarela o la transferencia.

Antes de crear la orden puede consultar cuánto cubriría una tarjeta con [Cotización de gift card](/checkout/cotizacion-de-gift-card). Esa consulta no crea nada ni descuenta saldo.

## Requisitos del sitio

Las gift cards exigen integración activa con Zauru. En la pestaña **Configuraciones de Zauru** del sitio:

- **Omitir envío a Zauru** debe estar **apagado**.
- **Token** debe estar lleno.

Si falta alguno de los dos, o no se resolvió sitio, la respuesta es HTTP 400 con `code: GiftCardRequiresZauruSync`:

| Situación | `message` |
|---|---|
| No se resolvió sitio | `GiftCard requires a site configuration with active Zauru integration.` |
| **Omitir envío a Zauru** activo | `GiftCard cannot be used when skip_zauru_sync is enabled.` |
| Sin **Token** | `GiftCard requires a valid Zauru token in site configuration.` |

## Campos del checkout

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `gift_card_1_id_number` | string | Si usa alguna tarjeta | Código de la primera tarjeta. |
| `gift_card_2_id_number` | string | No | Código de la segunda. |
| `gift_card_1_discount` | number | No | Tope a aplicar de la primera, en la moneda de la orden. Debe ser mayor o igual a 0. |
| `gift_card_2_discount` | number | No | Tope de la segunda. |

Combinaciones válidas: ninguna tarjeta, solo la primera, o las dos. Enviar solo la segunda es un error.

Si omite un tope, se aplica el máximo posible.

## Cómo se aplican

Las tarjetas se cotizan en orden, una contra el restante que deja la anterior:

```text
monto aplicado = mínimo entre (saldo convertido, tope pedido, restante de la orden)
```

Si el monto aplicable de una tarjeta es 0, esa tarjeta simplemente se omite y se continúa con la siguiente. No es un error.

Cuando el restante llega a 0, no se llama a la pasarela ni a la transferencia y la orden queda pagada.

## Errores de validación

Todos son HTTP 400, salvo el de tarjeta no encontrada:

| `code` | HTTP | Causa |
|---|---|---|
| `GiftCardPairingInvalid` | 400 | Se envió `gift_card_2_id_number` sin `gift_card_1_id_number` |
| `GiftCardDuplicate` | 400 | Las dos tarjetas tienen el mismo código |
| `GiftCardDiscountInvalid` | 400 | Un tope no es un número mayor o igual a 0 |
| `GiftCardRequiresZauruSync` | 400 | Falta la integración con Zauru, ver arriba |
| `GiftCardNotFound` | 404 | El código no existe en la entidad |
| `GiftCardVoided` | 400 | La tarjeta está anulada |
| `GiftCardNotIssued` | 400 | La tarjeta no ha sido emitida |
| `GiftCardWithoutBalance` | 400 | La tarjeta no tiene saldo |
| `GiftCardExchangeRateUnavailable` | 400 | No hay tasa de cambio entre la moneda de la tarjeta y la de la orden |

La lista completa, con los textos de `message` y `user_message`, está en [Cotización de gift card](/checkout/cotizacion-de-gift-card#errores).

## Qué devuelve la respuesta

La respuesta 200 del checkout siempre trae la clave `gift_card`. Es `null` si no se aplicó ninguna tarjeta. Si sí:

```json
{
  "gift_card_1_id_number": "GC-8891",
  "gift_card_2_id_number": "GC-8892",
  "gift_card_1_discount": 100.0,
  "gift_card_2_discount": 40.0,
  "applied_amount": 140.0,
  "remaining_to_charge": 50.0,
  "cards": [
    {
      "slot": 1,
      "code": "GC-8891",
      "gift_card_id": 1042,
      "applied_amount": 100.0,
      "applied_amount_in_gift_card_currency": 100.0,
      "currency_id": 1,
      "exchange_rate_to_order_currency": 1
    },
    {
      "slot": 2,
      "code": "GC-8892",
      "gift_card_id": 1043,
      "applied_amount": 40.0,
      "applied_amount_in_gift_card_currency": 40.0,
      "currency_id": 1,
      "exchange_rate_to_order_currency": 1
    }
  ]
}
```

| Clave | Tipo | Significado |
|---|---|---|
| `gift_card_1_id_number` | string \| null | Código de la primera tarjeta |
| `gift_card_2_id_number` | string \| null | Código de la segunda |
| `gift_card_1_discount` | number | Monto aplicado de la primera, en moneda de la orden. `0` si no se usó |
| `gift_card_2_discount` | number | Monto aplicado de la segunda |
| `applied_amount` | number | Suma de ambas |
| `remaining_to_charge` | number | Lo que debe cobrar la pasarela o la transferencia |
| `cards` | array | Solo las tarjetas que efectivamente aplicaron |
| `cards[].slot` | 1 \| 2 | Posición en la que se envió |
| `cards[].applied_amount_in_gift_card_currency` | number | Monto aplicado en la moneda de la tarjeta |
| `cards[].exchange_rate_to_order_currency` | number | Tasa usada en la conversión |

Cuando las gift cards cubren el total, el `message` de la orden es `Orden creada - Pago exitoso con GiftCard` y `payment_response` repite los mismos montos, sin el arreglo `cards`. Ver [Respuestas y errores](/checkout/respuestas-y-errores).

En la orden también quedan guardados los códigos, los descuentos por posición y el total, y el memo incluye el desglose.

## Cuándo se descuenta el saldo

El saldo de la tarjeta en Roplex se descuenta **solo después de que Zauru acepta la orden**. Consecuencias prácticas:

- Si Zauru rechaza la orden, la respuesta 200 igual muestra los montos aplicados, pero el saldo de la tarjeta **no** se movió.
- Si el restante se cobra con tarjeta y ese cobro pasa por 3-D Secure, el envío a Zauru se difiere hasta que la autenticación termine, y con él el descuento del saldo. Ver [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure).
- Los demás casos —solo gift card, transferencia y QPayPro— sincronizan justo después de crear la orden.

Reintentar el envío de la misma orden no descuenta el saldo dos veces.

## Troubleshooting

**HTTP 400 `GiftCardRequiresZauruSync`**
Es configuración del sitio, no del request. Revise **Omitir envío a Zauru** y **Token** en la pestaña **Configuraciones de Zauru**.

**HTTP 404 `GiftCardNotFound` con un código que existe**
La búsqueda es exacta y está limitada a su entidad. Revise mayúsculas, guiones y espacios.

**La tarjeta se aceptó pero el saldo sigue igual**
Zauru todavía no aceptó la orden, o el pago sigue pendiente de 3-D Secure. Revise el resultado del envío en **External Integrations → Respuestas de Webhooks**.

**La tarjeta cubría más de lo que aplicó**
El monto se limita al restante de la orden y al tope que haya enviado en `gift_card_1_discount` o `gift_card_2_discount`. También puede ser conversión de moneda: cotícela antes con [Cotización de gift card](/checkout/cotizacion-de-gift-card).
