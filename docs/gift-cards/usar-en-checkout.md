---
title: Usar GiftCards en el checkout
sidebar_label: Usar en el checkout
sidebar_position: 3
---

El checkout acepta una o dos GiftCards en la misma petición:

```text
POST /api/orders/create-ecommerce-order
```

Roplex calcula el total de los ítems y el envío, resta el descuento extra,
aplica las GiftCards en orden y cobra el restante con tarjeta o transferencia.
Si no envía otro medio de pago, crea la orden con el restante pendiente.

Consulte el contrato completo de la orden en
[Campos del endpoint](/checkout/campos). Esta página describe solo el
comportamiento de GiftCards.

## Requisitos del sitio

La redención exige integración activa con Zauru. En la pestaña
**Configuraciones de Zauru** del sitio:

- **Omitir envío a Zauru** debe estar apagado.
- **Token** debe tener un valor.

Si no se resolvió un sitio o falta una de esas condiciones, el checkout
devuelve HTTP 400 con `code: GiftCardRequiresZauruSync`.

| Situación | `message` |
|---|---|
| No se resolvió el sitio | `GiftCard requires a site configuration with active Zauru integration.` |
| **Omitir envío a Zauru** está activo | `GiftCard cannot be used when skip_zauru_sync is enabled.` |
| Falta **Token** | `GiftCard requires a valid Zauru token in site configuration.` |

Una cotización puede funcionar aunque estos requisitos no se cumplan, porque
`gift-card-quote` no necesita un sitio. La validación ocurre de nuevo al crear
la orden.

## Campos

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `gift_card_1_id_number` | string | Sí, si usa GiftCards | Código de la primera tarjeta. |
| `gift_card_2_id_number` | string | No | Código de la segunda tarjeta. No puede enviarse sola. |
| `gift_card_1_discount` | number \| string | No | Tope de la primera, en la moneda de la orden. |
| `gift_card_2_discount` | number \| string | No | Tope de la segunda, en la moneda de la orden. |

No existe un campo `use_gift_card`: la presencia de
`gift_card_1_id_number` activa el flujo.

Los topes deben ser números mayores o iguales a 0 y se redondean a dos
decimales. Si omite un tope, Roplex aplica el máximo posible. Un tope de `0`
omite esa tarjeta sin producir un error.

Combinaciones válidas:

- Ninguna GiftCard.
- Solo `gift_card_1_id_number`.
- `gift_card_1_id_number` y `gift_card_2_id_number`, con códigos distintos.

## Orden de cálculo

```text
total neto = total de ítems y envío - descuento extra

aplicación de la GiftCard 1 = mínimo entre:
  su saldo convertido
  gift_card_1_discount, si se envió
  total neto

restante 1 = total neto - aplicación de la GiftCard 1

aplicación de la GiftCard 2 = mínimo entre:
  su saldo convertido
  gift_card_2_discount, si se envió
  restante 1

remaining_to_charge = total neto - suma de ambas aplicaciones
```

La segunda tarjeta siempre se aplica contra lo que dejó la primera. Si la
primera cubre el total, Roplex no consulta ni aplica la segunda; no la envíe si
ya sabe que será innecesaria.

Si la moneda de una GiftCard difiere de la moneda de la orden, Roplex usa la
tasa de la entidad y descuenta de la tarjeta el equivalente en su propia
moneda.

## Ejemplo con una GiftCard

Este ejemplo usa recolección en tienda para omitir el cálculo de envío. Agregue
los demás campos que necesite su orden.

```bash
curl -X POST "https://<host-roplex>/api/orders/create-ecommerce-order" \
  -H "Authorization: users API-Key <clave>" \
  -H "Origin: https://tienda.ejemplo.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente Ejemplo",
    "email": "cliente@ejemplo.com",
    "phone": "55550010",
    "item": "42",
    "quantity": "1",
    "currency_id": 1,
    "store_pickup": true,
    "gift_card_1_id_number": "GC-8891"
  }'
```

## Ejemplo con dos GiftCards y topes

```json
{
  "gift_card_1_id_number": "GC-8891",
  "gift_card_1_discount": 100,
  "gift_card_2_id_number": "GC-8892",
  "gift_card_2_discount": 40
}
```

Incluya esas cuatro claves en el body normal de
`create-ecommerce-order`. En este ejemplo, la primera nunca aplicará más de 100
y la segunda nunca aplicará más de 40, aunque tengan más saldo.

## Combinar con otro medio de pago

Si `remaining_to_charge` es mayor que 0, puede completar la orden con:

- Tarjeta, enviando los ocho campos que activan el cobro con tarjeta.
- Transferencia, enviando sus datos y el comprobante en
  `multipart/form-data`.
- Ningún otro medio. La orden se crea pendiente, pero la parte de GiftCard se
  redime cuando Zauru acepta la orden.

No envíe tarjeta y transferencia juntas cuando quede un restante. El checkout
devuelve HTTP 400 con:

```text
Solo se puede utilizar un método de pago para el restante: tarjeta o transferencia.
```

Si las GiftCards cubren todo, el checkout no llama a la pasarela ni procesa una
transferencia. La orden queda pagada.

> **Nota:** `remaining_to_charge` usa la moneda de la orden. Si la pasarela
> cobra en otra moneda, el monto enviado a esa pasarela puede incluir una
> conversión adicional.

## Respuesta del checkout

La respuesta 200 siempre incluye `gift_card`. Es `null` cuando no se aplicó
ninguna y contiene el desglose cuando sí se aplicó al menos una:

```json
{
  "order_id": "0198f530-4fc7-7b73-8667-1c3459f291c9",
  "gift_card": {
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
  },
  "message": "Orden creada - Pago pendiente",
  "payment_response": {
    "success": true,
    "message": "Pago aplicado con GiftCard",
    "gift_card_1_id_number": "GC-8891",
    "gift_card_2_id_number": "GC-8892",
    "gift_card_1_discount": 100.0,
    "gift_card_2_discount": 40.0,
    "applied_amount": 140.0,
    "remaining_to_charge": 50.0
  }
}
```

Este ejemplo no envió otro medio para los 50 restantes, por eso la orden queda
pendiente. Si hubiera enviado tarjeta o transferencia, `payment_response`
describiría ese medio, mientras que `gift_card` conservaría el desglose de las
tarjetas.

| Clave | Tipo | Significado |
|---|---|---|
| `gift_card_1_id_number` | string \| null | Código de la primera tarjeta aplicada |
| `gift_card_2_id_number` | string \| null | Código de la segunda tarjeta aplicada |
| `gift_card_1_discount` | number | Monto de la primera, en la moneda de la orden |
| `gift_card_2_discount` | number | Monto de la segunda, en la moneda de la orden |
| `applied_amount` | number | Suma aplicada por ambas tarjetas |
| `remaining_to_charge` | number | Restante de la orden |
| `cards` | array | Solo contiene las tarjetas con un monto aplicado mayor que 0 |
| `cards[].slot` | `1` \| `2` | Posición recibida en el request |
| `cards[].applied_amount` | number | Aplicación en la moneda de la orden |
| `cards[].applied_amount_in_gift_card_currency` | number | Aplicación en la moneda de la tarjeta |
| `cards[].currency_id` | number | Moneda de la tarjeta |
| `cards[].exchange_rate_to_order_currency` | number | Tasa usada para convertir a la moneda de la orden |

Cuando las GiftCards cubren el total:

- `message` es `Orden creada - Pago exitoso con GiftCard`.
- `remaining_to_charge` es `0`.
- `payment_response.message` es `Pago aplicado con GiftCard`.
- La orden queda `paid` (**Pagada** en el admin).

Consulte las formas de `payment_response` para los demás medios en
[Respuestas y errores](/checkout/respuestas-y-errores).

## Cuándo se descuenta el saldo

La cotización y el inicio del checkout no reservan saldo. Roplex descuenta el
saldo sincronizado de cada GiftCard **después de que Zauru acepta la orden**.

| Resultado | Efecto sobre el saldo |
|---|---|
| GiftCards cubren el total y Zauru acepta | Se descuenta después del envío de la orden |
| GiftCard + transferencia o QPayPro exitoso | Se descuenta después del envío de la orden |
| GiftCard + NeoPay o BAC pendiente de 3-D Secure | Se espera a que termine la autenticación y Zauru acepte |
| La pasarela falla antes de crear la orden | No se descuenta |
| Zauru rechaza la orden | No se descuenta, aunque la respuesta del checkout muestre el monto calculado |

El reenvío de la misma orden no debe descontar dos veces la misma tarjeta. La
consulta de saldo puede cambiar entre la cotización y este momento; nunca trate
una cotización como reserva.

## Errores propios del checkout

| HTTP | `code` | Causa |
|---|---|---|
| 400 | `GiftCardPairingInvalid` | Llegó `gift_card_2_id_number` sin `gift_card_1_id_number` |
| 400 | `GiftCardDuplicate` | Los dos códigos, después de recortar espacios, son iguales |
| 400 | `GiftCardDiscountInvalid` | Un tope no es un número mayor o igual a 0 |
| 400 | `GiftCardRequiresZauruSync` | El sitio no tiene integración activa con Zauru |
| 404 | `GiftCardNotFound` | El código no existe en la entidad |
| 400 | `GiftCardVoided` | La tarjeta está anulada |
| 400 | `GiftCardNotIssued` | La tarjeta no ha sido emitida |
| 400 | `GiftCardWithoutBalance` | La tarjeta no tiene saldo |
| 400 | `GiftCardExchangeRateUnavailable` | Falta una tasa entre la moneda de la tarjeta y la de la orden |

Los errores de estado, saldo y moneda usan los mismos `message` y
`user_message` descritos en
[Consultar saldo y cotizar](/gift-cards/consultar-saldo#errores). El endpoint de
checkout no tiene el límite específico de cotizaciones.

## Comportamiento a tener en cuenta

- Roplex vuelve a validar saldo, estado y moneda durante el checkout.
- La segunda tarjeta no se evalúa si la primera ya cubrió el total.
- Una tarjeta con tope 0 se omite y no aparece en `cards`.
- La fecha de vencimiento no se valida al crear la orden.
- Los códigos se buscan exactamente dentro de la entidad de la clave de API.

## Troubleshooting

**HTTP 400 `GiftCardRequiresZauruSync`**
Revise **Omitir envío a Zauru** y **Token** en la pestaña
**Configuraciones de Zauru** del sitio que corresponde al `Origin` de la
petición.

**HTTP 404 `GiftCardNotFound` con un código que existe**
Revise mayúsculas, guiones, espacios y la entidad de la clave de API.

**La cotización funcionó pero el checkout rechazó la GiftCard**
La cotización no valida el sitio ni reserva saldo. Revise la integración con
Zauru y vuelva a consultar el saldo.

**La respuesta muestra la GiftCard, pero el saldo todavía no cambió**
Zauru aún no aceptó la orden o el cobro sigue pendiente de 3-D Secure. Revise
el envío en **External Integrations → Respuestas de Webhooks**.

**La GiftCard aplicó menos de lo esperado**
Revise el tope enviado, el restante que dejó la tarjeta anterior y la
conversión de moneda. Use
[Consultar saldo y cotizar](/gift-cards/consultar-saldo) con el mismo total y
la misma moneda.
