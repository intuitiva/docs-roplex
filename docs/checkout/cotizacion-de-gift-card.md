---
title: Cotización de gift card
sidebar_label: Cotización de gift card
sidebar_position: 9
---

Consulta cuánto cubriría una gift card de un total dado, sin crear la orden y sin descontar saldo. Sirve para mostrarle al comprador el desglose antes de que confirme.

```text
POST /api/orders/gift-card-quote
```

Cotiza **una sola** tarjeta por llamada, aunque el checkout acepte dos. Para cotizar la segunda, haga una segunda llamada usando como `order_total` el `remaining_amount` que devolvió la primera.

> **Advertencia:** el endpoint está limitado a **3 intentos por hora**. No lo llame en cada tecla ni en cada `blur` del campo. Ver [Límite de intentos](#límite-de-intentos).

## Request

**Headers:**

| Header | Valor |
|---|---|
| Authorization | `users API-Key <clave>` |
| Content-Type | `application/json` |

Solo acepta JSON. Con `multipart/form-data` la respuesta es HTTP 400 con `{ "success": false, "message": "No body" }`.

**Parámetros del body:**

| Nombre | Tipo | Requerido | Descripción |
|---|---|---|---|
| `gift_card_1_id_number` | string | Sí | Código de la tarjeta. Se recortan los espacios. |
| `gift_card_code` | string | — | Alias del anterior. Se usa solo si `gift_card_1_id_number` no vino. |
| `order_total` | number \| string | No | Total contra el que se cotiza. Si se omite, se cotiza solo contra el saldo. |
| `gift_card_1_discount` | number \| string | No | Tope máximo a aplicar, en la moneda de cotización. |
| `requested_amount` | number \| string | — | Alias del anterior. Se usa solo si `gift_card_1_discount` no vino. |
| `extra_discount_amount` | number \| string | No | Descuento que se resta del `order_total` antes de cotizar. Por defecto 0. |
| `currency_id` | number \| string | No | Moneda de la cotización. Si se omite, se usa la moneda de la entidad. |

Los números se aceptan como número o como string numérico: `"150.50"` y `150.5` son equivalentes.

**Precedencia de alias.** Cuando llegan las dos formas, gana la del checkout:

| Se usa | Se ignora |
|---|---|
| `gift_card_1_id_number` | `gift_card_code` |
| `gift_card_1_discount` | `requested_amount` |

Los nombres `gift_card_1_id_number` y `gift_card_1_discount` son los mismos del checkout, así que puede pasarle al endpoint el mismo objeto que después enviará a crear la orden.

**Ejemplo:**

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
| `success` | boolean | Siempre `true` en la respuesta 200 |
| `valid` | boolean | Siempre `true` en la respuesta 200 |
| `gift_card_id` | number | Id de la tarjeta en Roplex |
| `id_number` | string | Código de la tarjeta, tal como está registrado |
| `available_balance` | number | Saldo, en la **moneda de la tarjeta** |
| `currency` | object | Moneda de la tarjeta, con `id`, `code` y `prefix` |
| `target_currency` | object | Moneda de la cotización, misma forma |
| `conversion_rate_to_target` | number | Tasa aplicada. `1` si ambas monedas coinciden |
| `available_balance_target_currency` | number | Saldo convertido a la moneda de cotización |
| `applicable_amount` | number | **Lo que realmente cubriría**, en moneda de cotización |
| `applicable_amount_in_gift_card_currency` | number | Ese mismo monto, en moneda de la tarjeta |
| `remaining_amount` | number | Lo que quedaría por cobrar con otro medio |
| `order_total` | number \| null | Total ya con `extra_discount_amount` restado. `null` si no envió `order_total` |

En el ejemplo, `order_total` es 450 y no 500 porque se restaron los 50 de `extra_discount_amount`. La tarjeta tiene 300 USD, que a 7.80 son 2340 GTQ, pero solo aplica 450 porque ese es el total.

### Cómo se calcula el monto aplicable

```text
applicable_amount = mínimo entre:
  saldo convertido a la moneda de cotización
  el tope de gift_card_1_discount, si lo envió
  order_total menos extra_discount_amount, si lo envió
```

Si omite `order_total`, `applicable_amount` es el saldo convertido —limitado por el tope— y `remaining_amount` es `0`. Todos los montos se redondean a dos decimales.

## Errores

Cuerpo de error:

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

> **Nota:** en cuatro de estos códigos el `user_message` es el propio código, no una frase. No los muestre tal cual al comprador: traduzca `GiftCardNotFound`, `GiftCardVoided`, `GiftCardNotIssued` y `GiftCardWithoutBalance` a su propio texto.

## Límite de intentos

Tres intentos por hora, contados en **dos ámbitos independientes**:

- Por usuario de la clave de API.
- Por dirección IP de origen.

Se bloquea al alcanzar el límite en **cualquiera** de los dos. Esto importa cuando varias tiendas comparten un mismo servidor de salida: se pueden bloquear entre sí por IP aunque cada una use su propia clave.

Cuentan los intentos con cualquier resultado: éxito, tarjeta no encontrada, moneda inválida. Solo los propios 429 no se cuentan.

Cuerpo del 429:

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

**La respuesta no trae header `Retry-After`.** Lea `retry_after_seconds` del cuerpo. Es el tiempo hasta que la ventana deslizante libere el intento más antiguo.

Recomendaciones para la tienda:

- Cotice solo cuando el comprador termine de escribir el código y salga del campo, nunca en cada tecla.
- Guarde la cotización en la sesión y reutilícela mientras el total no cambie.
- No reintente automáticamente tras un 429: respete `retry_after_seconds`.

## Diferencias con el checkout

| | Cotización | Checkout |
|---|---|---|
| Tarjetas por llamada | Una | Hasta dos |
| Descuenta saldo | No | Sí, después de que Zauru acepta la orden |
| Crea la orden | No | Sí |
| Requiere integración con Zauru | **No** | Sí, con `GiftCardRequiresZauruSync` si falta |
| Límite de intentos | 3 por hora | Sin límite específico |

Que la cotización pase no garantiza que el checkout acepte la tarjeta: el checkout además exige que el sitio tenga la integración con Zauru activa. Ver [Gift cards](/checkout/gift-cards#requisitos-del-sitio).

## Comportamiento a tener en cuenta

- **La fecha de vencimiento no se valida.** Una tarjeta vencida con saldo se cotiza como aplicable, siempre que esté emitida y no anulada.
- **La búsqueda del código es exacta**, sensible a mayúsculas, y limitada a su entidad.
- Una tarjeta con saldo exactamente 0 devuelve `GiftCardWithoutBalance`, no una cotización de 0.

## Troubleshooting

**HTTP 400 `No body`**
Se envió `multipart/form-data` o un JSON mal formado. El endpoint solo acepta `application/json`.

**HTTP 404 `GiftCardNotFound` con un código que existe**
Revise mayúsculas, guiones y espacios. La búsqueda es exacta y solo mira las tarjetas de su entidad.

**HTTP 429 en la primera prueba del día**
El límite también cuenta por IP. Si comparte servidor de salida con otras tiendas, ya se pudo haber consumido. Espere lo que indique `retry_after_seconds`.

**`applicable_amount` es menor al saldo de la tarjeta**
Es lo esperado si envió `order_total` o un tope en `gift_card_1_discount`. Compare con `available_balance_target_currency` para ver el saldo convertido completo.

**HTTP 400 `GiftCardExchangeRateUnavailable`**
Falta la tasa entre la moneda de la tarjeta y la de cotización en las **Tasas de Cambio** de la entidad.
