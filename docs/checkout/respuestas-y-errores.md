---
title: Respuestas y errores
sidebar_label: Respuestas y errores
sidebar_position: 12
---

El éxito **no** se envuelve en `{ "success": true }` a nivel raíz. Los errores sí usan `success: false`.

## Respuesta 200

```json
{
  "order_id": "uuid",
  "gift_card": null,
  "message": "Orden creada - …",
  "payment_response": {}
}
```

| Clave | Tipo | Contenido |
|---|---|---|
| `order_id` | string | UUID de la orden. Es el identificador que debe guardar la tienda. |
| `gift_card` | object \| null | `null` si no se aplicó ninguna tarjeta. Ver [Gift cards](/checkout/gift-cards#qué-devuelve-la-respuesta). |
| `message` | string | Resultado en texto. Ver la tabla siguiente. |
| `payment_response` | object \| null | Depende del medio de cobro. Ver más abajo. |

Valores posibles de `message`:

| Situación | `message` |
|---|---|
| Transferencia registrada | `Orden creada - Transferencia bancaria registrada` |
| QPayPro cobró bien | `Orden creada - Pago exitoso` |
| Las gift cards cubrieron el total | `Orden creada - Pago exitoso con GiftCard` |
| BAC inició el cobro | `Orden creada - Pendiente de autenticación 3D-Secure` |
| Cualquier otro caso, incluido NeoPay | `Orden creada - Pago pendiente` |

> **Nota:** `Orden creada - Pago pendiente` no significa que el cobro haya fallado. Con NeoPay es el mensaje normal de un cobro que apenas comienza.

## payment_response según el medio de cobro

**Transferencia**

```json
{
  "success": true,
  "message": "…",
  "bank_transfer_request_id": 1
}
```

**NeoPay**

```json
{
  "success": true,
  "user_message": "Pendiente de cobro",
  "neo_pay_request_id": 1,
  "access_token": "…",
  "device_data_collection_url": "https://…"
}
```

**QPayPro**

```json
{
  "success": true,
  "user_message": "…",
  "qpaypro_request_id": 1,
  "transaction_id": "…",
  "authorization_code": "…",
  "redirect_url": "https://tienda.ejemplo.com/confirmacion-de-orden/<order_id>?status=success",
  "should_redirect": true
}
```

`redirect_url` solo aparece cuando el cobro fue exitoso y `should_redirect` es `true`.

**BAC**

```json
{
  "success": true,
  "message": "…",
  "user_message": "…",
  "bac_request_id": 1,
  "spi_token": "…",
  "redirect_data": "…",
  "requires_payment": true,
  "requires_3ds_authentication": true
}
```

**Solo gift card**, cuando el restante quedó en 0:

```json
{
  "success": true,
  "message": "Pago aplicado con GiftCard",
  "gift_card_1_id_number": "…",
  "gift_card_2_id_number": null,
  "gift_card_1_discount": 150.5,
  "gift_card_2_discount": 0,
  "applied_amount": 150.5,
  "remaining_to_charge": 0
}
```

**Sin cobro:** `payment_response` es `null`.

## Estado de la orden

El estado **no viaja en la respuesta 200**. Así queda la orden al crearse:

| Situación | Estado | Como se ve en el admin |
|---|---|---|
| Las gift cards cubrieron el total | `paid` | Pagada |
| Transferencia registrada | `paid` | Pagada |
| QPayPro cobró bien, o BAC sin `redirect_data` | `paid` | Pagada |
| Tarjeta pendiente de 3-D Secure | `processing` | Procesando |
| Sin cobro | `pending` | Pendiente |

Después de la creación, el estado puede cambiar:

| Estado | Como se ve en el admin | Quién lo pone |
|---|---|---|
| `invoiced` | Facturada | Zauru, al facturar |
| `completed` | Completada | Zauru, al pagar y facturar |
| `cancelled` | Cancelada | Zauru, al cancelar |
| `refunded` | Reembolsada | Roplex, al revertir un cobro |
| `failed` | Fallida | Roplex, cuando la tarjeta no pasa |

### Consultar el estado final

No hay un endpoint dedicado de estado de pago. Para confirmar el resultado de una orden, léala con la misma clave de API:

```bash
curl "https://<host-roplex>/api/orders/<order_id>" \
  -H "Authorization: users API-Key <clave>"
```

El campo `state` de la respuesta trae el estado actual. Úselo sobre todo después de un cobro con 3-D Secure, donde el resultado llega minutos más tarde. Ver [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure).

## Errores

Cuerpo típico:

```json
{
  "success": false,
  "message": "…",
  "user_message": "…",
  "code": "…"
}
```

`user_message` es el texto pensado para mostrarle al comprador; `message` puede ser el mismo o más específico. La clave `code` solo aparece en los errores de gift card y de cotización.

| HTTP | Cuándo |
|---|---|
| 401 | Clave de API ausente o inválida: `User not found` |
| 400 | Entidad no seleccionada; sin ítems; ítem o paquete inválido; `currency_id` inexistente; sin precio sugerido; total inválido; descuento extra inválido; gift card inválida o sin integración con Zauru; tarjeta y transferencia a la vez; moneda incompatible con la pasarela; sin mapeo de moneda a método; sin stock; datos del cliente incorrectos; campos de tarjeta sin pasarela configurada; estado o ciudad faltantes para tarjeta; tipo de tarjeta no soportado; American Express con NeoPay; transferencia incompleta o sin comprobante; sin tasa de cambio para convertir a la moneda de la pasarela |
| 404 | Gift card no encontrada: `GiftCardNotFound` |
| 429 | Demasiadas cotizaciones de gift card: `GiftCardQuoteRateLimitExceeded` |
| 400 o 500 | Falla de la pasarela. Es 400 si hay `user_message`, 500 si no. QPayPro además incluye `qpaypro_response` con un `redirect_url` de error |
| 400 | `{ "message": "No body" }` o `{ "message": "FormData not available" }`, sin la clave `success` |

Los códigos de gift card están listados en [Cotización de gift card](/checkout/cotizacion-de-gift-card#errores).

## Troubleshooting

**La respuesta fue 200 pero el comprador no pagó**
Revise `message` y `payment_response`. Con `Orden creada - Pago pendiente` y `payment_response` en `null`, la orden se creó sin cobro. Con NeoPay ese mismo mensaje significa que el cobro apenas empieza.

**Se recibió 200 y la orden aparece en Procesando**
Es lo esperado con 3-D Secure. Consulte el estado después, con la lectura de la orden.

**Error 500 sin `user_message`**
La pasarela devolvió algo que Roplex no pudo interpretar. Es un caso para revisar con el administrador de la tienda, no algo corregible desde el request.
