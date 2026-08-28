---
title: Respuestas y errores
sidebar_label: Respuestas y errores
sidebar_position: 10
---

El endpoint no envuelve el éxito en `{ "success": true }` al nivel raíz. El error sí usa `success: false`.

## HTTP 200

```json
{
  "order_id": "uuid",
  "gift_card": null,
  "message": "Orden creada - …",
  "payment_response": {}
}
```

- **order_id**: UUID de `orders`.
- **gift_card**: `null` si no se aplicó ninguna. Si sí:
  - `gift_card_1_id_number`, `gift_card_2_id_number`
  - `gift_card_1_discount`, `gift_card_2_discount`
  - `applied_amount`, `remaining_to_charge`
  - `cards`: arreglo con `slot`, `code`, `gift_card_id`, `applied_amount`, `applied_amount_in_gift_card_currency`, `currency_id`, `exchange_rate_to_order_currency`
- **message**:
  - Transferencia ok: `Orden creada - Transferencia bancaria registrada`
  - QPayPro ok: `Orden creada - Pago exitoso`
  - GiftCard cubre el total: `Orden creada - Pago exitoso con GiftCard`
  - BAC ok: `Orden creada - Pendiente de autenticación 3D-Secure`
  - Cualquier otro éxito (incluye NeoPay 3DS): `Orden creada - Pago pendiente`

### payment_response según el camino

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
  "user_message": "…",
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

`redirect_url` solo se arma si `success` y `should_redirect`.

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

**Solo GiftCard** (restante 0, sin pasarela ni transferencia en la respuesta):

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

El campo `orders.state` no viaja en la respuesta 200. Queda así al crear:

| Condición | state |
|---|---|
| GiftCard cubre el total | `paid` |
| Transferencia | `paid` |
| QPayPro ok, o BAC ok sin `redirect_data` | `paid` |
| Tarjeta con 3DS (NeoPay; BAC con `redirect_data`) | `processing` |
| Sin cobro | `pending` |

Zauru puede pasar después a `invoiced`, `completed` o `cancelled`. Roplex pone `refunded` al revertir un cobro y `failed` si la tarjeta no pasa en un flujo posterior.

## Errores frecuentes

Cuerpo típico: `{ "success": false, "message": "…", "user_message": "…", "code": "…" }`. `code` solo en GiftCard y algunos de cotización. `user_message` es el texto para la tienda; `message` puede ser el mismo o más técnico.

| HTTP | Cuándo |
|---|---|
| 401 | Sin usuario de API key (`User not found`) |
| 400 | Entidad no seleccionada; sin ítems; ítem/bundle inválido; `currency_id` inexistente; sin precio sugerido; total `NaN`; descuento extra inválido; GiftCard inválida o sin Zauru; tarjeta + transferencia a la vez; moneda incompatible con la pasarela; sin mapeo moneda→método; sin stock; datos de cliente; sin pasarela con campos de tarjeta; estado/ciudad faltantes para tarjeta; tipo de tarjeta desconocido; Amex + NeoPay; transferencia incompleta o sin `transFile`; conversión a GTQ/USD sin tasa |
| 404 | GiftCard no encontrada (`GiftCardNotFound`) |
| 400 o 500 | Fallo de pasarela: 400 si hay `user_message`, 500 si no. QPayPro además manda `qpaypro_response` y `redirect_url` de error |
| 400 | `{ "message": "No body" }` o `{ "message": "FormData not available" }` (sin `success`) |
| 400 | `{ "message": "No request" }` si no hay `req` |

Los PAN, fechas y CVV no se loguean en claro.
