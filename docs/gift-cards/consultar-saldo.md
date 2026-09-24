---
title: Consultar saldo y cotizar
sidebar_label: Consultar saldo y cotizar
sidebar_position: 2
---

Use este endpoint para validar una GiftCard, consultar su saldo y calcular
cuánto cubriría de una orden, sin crear la orden ni descontar saldo:

```text
POST /api/orders/gift-card-quote
```

El endpoint cotiza **una sola tarjeta por petición**. Si el checkout aceptará
dos, haga una cotización para cada una en el orden en que las aplicará.

> **Advertencia:** la configuración predeterminada permite 3 intentos por hora.
> No consulte en cada tecla. Reutilice el resultado mientras no cambien el
> código, el total ni la moneda.

## Request

**Headers:**

| Header | Valor |
|---|---|
| `Authorization` | `users API-Key <clave>` |
| `Content-Type` | `application/json` |

La clave de API debe tener una entidad seleccionada. La consulta no necesita
resolver un sitio y no exige que la integración con Zauru esté activa.

**Parámetros del body:**

| Nombre | Tipo | Requerido | Descripción |
|---|---|---|---|
| `gift_card_1_id_number` | string | Sí | Código exacto de la tarjeta. Los espacios de los extremos se eliminan. |
| `gift_card_code` | string | — | Alias del campo anterior. Solo se usa cuando `gift_card_1_id_number` no está presente. |
| `order_total` | number \| string | No | Total contra el que se cotiza. Si se omite, la respuesta funciona como consulta de saldo. |
| `gift_card_1_discount` | number \| string | No | Tope máximo a aplicar, en la moneda de cotización. |
| `requested_amount` | number \| string | — | Alias del tope anterior. |
| `extra_discount_amount` | number \| string | No | Monto que se resta de `order_total` antes de cotizar. Por defecto es 0. |
| `currency_id` | number \| string | No | Moneda de la cotización. Si se omite, se usa la moneda de la entidad. |

Los montos válidos deben ser números mayores o iguales a 0. Se aceptan como
número JSON o como string numérico: `150.5` y `"150.50"` son equivalentes.

Cuando envía los dos nombres de un mismo valor, se usa esta precedencia:

| Tiene precedencia | Alternativa |
|---|---|
| `gift_card_1_id_number` | `gift_card_code` |
| `gift_card_1_discount` | `requested_amount` |

Los nombres con prefijo `gift_card_1_` también se usan en el checkout, por lo
que puede reutilizar esos campos al crear la orden.

`extra_discount_amount` afecta únicamente este cálculo. Envíe el descuento que
realmente aplicará el checkout; este endpoint no consulta la configuración del
sitio y no procesa `extra_discount_percent`.

### Consultar solo el saldo

Omita `order_total` para consultar el saldo disponible y su equivalente en la
moneda elegida:

```bash
curl -X POST "https://<host-roplex>/api/orders/gift-card-quote" \
  -H "Authorization: users API-Key <clave>" \
  -H "Content-Type: application/json" \
  -d '{
    "gift_card_1_id_number": "GC-8891",
    "currency_id": 1
  }'
```

En este modo, `available_balance` es el saldo actual en la moneda de la tarjeta
y `available_balance_target_currency` es su valor convertido. Como no hay una
orden contra la cual calcular un faltante, `order_total` es `null` y
`remaining_amount` es `0`.

### Cotizar contra una orden

Envíe `order_total` para saber cuánto aplicaría y cuánto faltaría por cobrar:

```bash
curl -X POST "https://<host-roplex>/api/orders/gift-card-quote" \
  -H "Authorization: users API-Key <clave>" \
  -H "Content-Type: application/json" \
  -d '{
    "gift_card_1_id_number": "GC-8891",
    "order_total": 500,
    "extra_discount_amount": 50,
    "currency_id": 1
  }'
```

## Respuesta 200

```json
{
  "success": true,
  "valid": true,
  "gift_card_id": 1042,
  "id_number": "GC-8891",
  "available_balance": 300.0,
  "currency": { "id": 2, "code": "USD", "prefix": "$" },
  "target_currency": { "id": 1, "code": "GTQ", "prefix": "Q" },
  "conversion_rate_to_target": 7.8,
  "available_balance_target_currency": 2340.0,
  "applicable_amount": 450.0,
  "applicable_amount_in_gift_card_currency": 57.69,
  "remaining_amount": 0.0,
  "order_total": 450.0
}
```

| Clave | Tipo | Significado |
|---|---|---|
| `success` | boolean | Siempre `true` en una respuesta 200 |
| `valid` | boolean | Siempre `true` en una respuesta 200 |
| `gift_card_id` | number | Identificador de la tarjeta |
| `id_number` | string | Código tal como está registrado |
| `available_balance` | number | Saldo actual, en la moneda de la GiftCard |
| `currency` | object | Moneda de la GiftCard: `id`, `code` y `prefix` |
| `target_currency` | object | Moneda de la cotización, con la misma forma |
| `conversion_rate_to_target` | number | Tasa aplicada; `1` si las monedas coinciden |
| `available_balance_target_currency` | number | Saldo convertido a la moneda de cotización |
| `applicable_amount` | number | Monto que cubriría, en la moneda de cotización |
| `applicable_amount_in_gift_card_currency` | number | Monto que se descontaría, en la moneda de la GiftCard |
| `remaining_amount` | number | Restante de la orden, no saldo restante de la tarjeta |
| `order_total` | number \| null | Total después de restar `extra_discount_amount`; `null` si se omitió |

En el ejemplo, los 500 de la orden bajan a 450 por el descuento extra. La
GiftCard tiene 300 USD, equivalentes a 2340 GTQ, pero solo aplicaría 450 GTQ
porque no puede superar el total.

### Cálculos

```text
total efectivo = máximo(order_total - extra_discount_amount, 0)

applicable_amount = mínimo entre:
  available_balance_target_currency
  gift_card_1_discount, si lo envió
  total efectivo, si envió order_total

remaining_amount = máximo(total efectivo - applicable_amount, 0)

saldo proyectado de la GiftCard =
  available_balance - applicable_amount_in_gift_card_currency
```

Todos los montos se redondean a dos decimales. El saldo proyectado no se guarda
en esta operación: la consulta no reserva ni descuenta saldo.

## Cotizar dos GiftCards

1. Cotice la primera con el total efectivo de la orden.
2. Si `remaining_amount` es mayor que 0, cotice la segunda usando ese valor como
   su `order_total`.
3. En la segunda llamada también use `gift_card_1_id_number`, pero coloque allí
   el código de la segunda tarjeta; este endpoint solo tiene un slot.
4. En el checkout, envíe los códigos en `gift_card_1_id_number` y
   `gift_card_2_id_number`.

Si la primera respuesta trae `remaining_amount: 0`, no necesita cotizar ni
enviar una segunda tarjeta.

## Errores

Cuerpo típico:

```json
{
  "success": false,
  "valid": false,
  "code": "GiftCardNotFound",
  "message": "Gift card not found for selected entity.",
  "user_message": "GiftCardNotFound"
}
```

| HTTP | `code` | `message` | `user_message` |
|---|---|---|---|
| 400 | — | `No body` | — |
| 401 | — | `User not found` | — |
| 400 | — | `User does not have an entity selected` | — |
| 400 | `CurrencyNotFound` | `El currency_id enviado (N) no existe.` | `La moneda enviada no es válida.` |
| 400 | `GiftCardCodeRequired` | `gift_card_code is required.` | `Debe enviar el código de GiftCard.` |
| 404 | `GiftCardNotFound` | `Gift card not found for selected entity.` | `GiftCardNotFound` |
| 400 | `GiftCardVoided` | `Gift card is voided and cannot be used.` | `GiftCardVoided` |
| 400 | `GiftCardNotIssued` | `Gift card is not issued yet.` | `GiftCardNotIssued` |
| 400 | `GiftCardWithoutBalance` | `Gift card does not have available balance.` | `GiftCardWithoutBalance` |
| 400 | `GiftCardTypeWithoutCurrency` | `Gift card type does not define a currency.` | `La GiftCard no tiene moneda configurada.` |
| 400 | `GiftCardCurrencyNotFound` | `Gift card currency could not be resolved.` | `No se pudo resolver la moneda de la GiftCard.` |
| 400 | `GiftCardTargetCurrencyNotFound` | `Target currency could not be resolved.` | `No se pudo resolver la moneda objetivo de la orden.` |
| 400 | `GiftCardExchangeRateUnavailable` | `No exchange rate found between gift card currency and target currency.` | `No existe una tasa de cambio configurada para aplicar la GiftCard en esta moneda.` |
| 400 | `GiftCardInvalidOrderTotal` | `Order total must be a valid number greater or equal than zero.` | `El total de la orden enviado para cotizar la GiftCard no es válido.` |
| 400 | `GiftCardInvalidRequestedAmount` | `Requested gift card amount must be a valid number greater or equal than zero.` | `El monto solicitado de la GiftCard no es válido. Debe ser un número mayor o igual a cero.` |
| 429 | `GiftCardQuoteRateLimitExceeded` | `Rate limit exceeded: N intentos cada M segundos por usuario o IP.` | `Demasiados intentos de consulta de GiftCard. Intente de nuevo en unos minutos.` |

En `GiftCardNotFound`, `GiftCardVoided`, `GiftCardNotIssued` y
`GiftCardWithoutBalance`, `user_message` es un código y no una frase para el
comprador. Tradúzcalo en su tienda.

## Límite de intentos

El valor predeterminado es 3 intentos en una ventana de una hora. El límite se
evalúa de forma independiente:

- Por usuario de la clave de API dentro de la entidad.
- Por dirección IP dentro de la misma entidad.

Se bloquea la consulta cuando cualquiera de los dos alcanza el límite. Todas
las respuestas previas cuentan, tanto éxitos como errores. Las propias
respuestas 429 se registran, pero no consumen intentos adicionales.

```json
{
  "success": false,
  "valid": false,
  "code": "GiftCardQuoteRateLimitExceeded",
  "message": "Rate limit exceeded: 3 intentos cada 3600 segundos por usuario o IP.",
  "user_message": "Demasiados intentos de consulta de GiftCard. Intente de nuevo en unos minutos.",
  "retry_after_seconds": 2841
}
```

La respuesta no incluye el header `Retry-After`. Espere los segundos de
`retry_after_seconds` y no reintente automáticamente antes.

## Comportamiento a tener en cuenta

- La fecha de vencimiento no se valida. Una tarjeta vencida con saldo puede
  cotizar como válida si está emitida y no anulada.
- Una tarjeta con saldo exactamente 0 devuelve `GiftCardWithoutBalance`.
- La cotización no valida la configuración del sitio ni la integración con
  Zauru. Esas condiciones se revisan al crear la orden.
- El checkout vuelve a consultar la GiftCard. Use su respuesta, no la
  cotización previa, como resultado definitivo.

## Troubleshooting

**HTTP 400 `No body`**
Envíe JSON válido con `Content-Type: application/json`. Este endpoint no acepta
el comprobante ni el `multipart/form-data` del checkout.

**HTTP 404 `GiftCardNotFound` con un código que existe**
Revise mayúsculas, guiones y espacios. La búsqueda es exacta y solo consulta la
entidad de la clave de API.

**HTTP 429 en la primera prueba**
Otra integración de la misma entidad pudo consumir el límite del usuario o de
la IP. Espere lo que indique `retry_after_seconds`.

**`applicable_amount` es menor al saldo**
Compare con `order_total`, `gift_card_1_discount` y
`available_balance_target_currency`. Cualquiera de esos valores puede limitar
el monto aplicable.

**HTTP 400 `GiftCardExchangeRateUnavailable`**
Falta la tasa entre la moneda de la GiftCard y la moneda de cotización en las
**Tasas de Cambio** de la entidad.
