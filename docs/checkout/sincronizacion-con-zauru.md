---
title: Sincronización con Zauru
sidebar_label: Sincronización con Zauru
sidebar_position: 11
---

Después de persistir la orden, Roplex llama a `sendOrderToWebhooks`, salvo que el pago de tarjeta esté pendiente de 3-D Secure (NeoPay con `device_data_collection_url` o BAC con `redirect_data`). En 3DS el envío ocurre en el step 5.

Esa función arma un JSON (`raw_params`) y `dispatchEcommerceIntegration` lo manda a Zauru y a cada webhook del sitio. El resultado (URL, body, respuesta, status, duración) se guarda en `webhook_responses`.

Desde el admin, la acción **Reenviar a webhooks** llama `POST /api/orders/:id/reSendOrderToWebhooks`. Usa el `request_host` guardado en la orden, no el Origin del admin.

## Cuándo se llama a Zauru

Se intenta el POST si hay sitio, `skip_zauru_sync` está apagado y hay `sites.token`. El correo de Zauru es `sites.user_email` (si falta, el email del usuario Payload).

- URL: `{ZAURU_HOST}/ecommerce/ecommerce_requests.json` (`ZAURU_HOST_PRODUCTION` o `ZAURU_HOST_STAGING` según `APP_ENV`).
- Headers: `Content-Type: application/json`, `X-User-Email`, `X-User-Token`.
- Cuerpo:

```json
{
  "ecommerce_request": {
    "raw_params": "<string JSON>",
    "original_request": "{\"id\":\"<order_uuid>\"}"
  }
}
```

Se considera éxito HTTP 200 o 201. Si el primer intento falla y el payload traía campos de GiftCard o `payment.amount`, se reintenta **sin** esos campos (`gift_card_*`, `remaining_gateway_amount`, `payment.amount`) por si el ERP aún no los acepta.

Roplex no espera a que Zauru facture para responder 200 al storefront. Si Zauru falla, la orden en Roplex ya existe; se puede reenviar.

## raw_params

Tres bloques. `client` y `order` siempre. `payment` solo si hay datos de cobro resueltos (pasarela aprobada o transferencia registrada).

### client

- **name**, **email**, **phone**, **tin** (default `CF`)
- **address_line_1** y **delivery_address**: ambos con la dirección de entrega
- **notes**: fijo `"Creado desde Roplex"`

### order

- **date**: ISO al momento del envío
- **order_number**: UUID de Roplex
- **extra_discount**
- **gift_card_discount**, **gift_card_1_id_number**, **gift_card_2_id_number**, **gift_card_1_discount**, **gift_card_2_discount**, **remaining_gateway_amount**
- **reference**: `orders.reference` y `orders.payment_reference` unidos con ` - `
- **memo**: `payment_memo` y `memo` de la orden unidos
- **delivery_instructions**, y si se resolvieron: **city_id**, **city_name**, **state_id**
- **invoice_details_attributes**: cada línea con `item_id` / `item_code` / `item_name` o `bundle_id` / `bundle_code` / `bundle_name`, más `quantity` y `unit_price` (ya en moneda de cobro, incluye la línea de envío si hubo)

### payment (opcional)

- **reference**, **receipt**, **memo**: salen del request de NeoPay (step5 o step3), QPayPro (`result === 1`), BAC (`Approved`) o transferencia (`number` / banco)
- **amount**: restante cobrado por pasarela o transferencia (`remaining_gateway_amount`)
- **payment_method_id**: método Zauru del mapeo moneda→método del bloque activo
- **image_url**: URL del comprobante en `media`, solo transferencia

## Webhooks del sitio

Cada fila de `sites.ecommerce_webhooks` con `enabled` distinto de `false` y `url` válida recibe un POST independiente, **aunque** `skip_zauru_sync` esté activo. El body es el mismo `ecommerce_request` (`raw_params` + `original_request`). No lleva headers de Zauru. Un fallo en una URL no cancela las demás.

## GiftCard y Zauru

La redención del saldo en Roplex (`redeemOrderGiftCardLocally`) corre solo si `zauruSuccess` es verdadero. Si Zauru no aceptó el request, el saldo local no se mueve.

## Correo

No es el mismo canal. `sendOrderEmail` encola en SQS (confirmación al cliente y copia de despacho) salvo 3DS pendiente. Si `send_customer_order_emails` está apagado, no se encola el automático; el reenvío desde admin sí. Asuntos vacíos en el sitio: el mailer de Zauru usa el template.
