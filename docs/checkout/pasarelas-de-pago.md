---
title: Pasarelas de pago
sidebar_label: Pasarelas de pago
sidebar_position: 9
---

El sitio elige **una** pasarela de tarjeta (`sites.payment_method`: `neo_pay`, `qpaypro` o `bac_powertranz`). Vacío = no se cobra con tarjeta. Transferencia y GiftCard son complementarias, no sustituyen ese select.

El body no manda el nombre de la pasarela. Si están los ocho campos de tarjeta, se usa `sites.payment_method`. Si están los de transferencia, se registra un `bank_transfer_request`. No se pueden combinar tarjeta y transferencia para el restante.

## Monedas

Antes de cobrar se valida `currency_id` contra el bloque activo:

| Bloque | Monedas |
|---|---|
| `neo_pay` | GTQ (id 1) |
| `bac-powertranz` | GTQ (id 1) |
| `qpaypro` | GTQ (id 1) o USD (id 2) |
| `transferencias` | cualquiera |

El select del sitio usa `bac_powertranz`; el slug del bloque es `bac-powertranz`.

Si la moneda no es compatible: HTTP 400. Si el bloque no tiene fila `currency_payment_methods` para esa moneda: HTTP 400 `No hay un método de pago configurado para la moneda…`.

NeoPay y BAC cobran **siempre en GTQ**. Si los ítems van en otra moneda, se convierte el restante a GTQ con `exchange_rates` (`computePaymentAmount`). QPayPro cobra en GTQ o USD según el método mapeado. Sin tasa: HTTP 400.

## Tarjeta: bill-to

Con tarjeta se carga `states` por `state` (id numérico). `city` es el municipio (texto). El bill-to de la pasarela usa:

- **FirstName** / **LastName**: del body
- **Email** / teléfono: del `ecommerce_client`
- **AddressOne**: `address_line_1`
- **Locality**: `city`
- **AdministrativeArea**: sufijo de `state.iso3166_2_code` (parte después del guion)
- **PostalCode**: `state.postal_code` (no el `postal_code` del body)
- **Country**: `state.country.code`

Si `validateBillTo` falla, HTTP 400 con el mensaje de esa validación.

## NeoPay

Credenciales del bloque `neo_pay`: `merchant_user`, `merchant_passwd`, `terminal_id`, `card_acq_id`, `api_url`, ambiente, Visa Cuotas.

American Express (`003`) no se procesa: HTTP 400 `American Express no es soportado por NeoPay`.

El cobro es el paso 1 de 3-D Secure. La respuesta 200 incluye `neo_pay_request_id`, `access_token` y `device_data_collection_url`. `orders.state` queda `processing`. El banco vuelve a `/api/order-step5?neo_pay_request_id=…&user_id=…` y luego a `/api/order-step5-process`. Desde ahí se redirige a Webstudio (`success_redirect_path` o `error_redirect_path` concatenados al `url_commerce` del ambiente).

Mientras haya `device_data_collection_url`, el checkout **no** envía webhooks ni correo. Eso ocurre en el step 5.

## QPayPro

Credenciales del bloque `qpaypro`: `x_login`, `x_private_key`, `x_api_secret`, `api_url`, ambiente, Visa Cuotas.

Si el cobro sale bien, `orders.state` queda `paid` y `message` es `Orden creada - Pago exitoso`. `payment_response` trae `qpaypro_request_id`, `transaction_id`, `authorization_code`, `should_redirect` y, si hay redirect, `redirect_url` con `/{order_id}?status=success`.

Si falla, HTTP 400/500 con `qpaypro_response.redirect_url` hacia `error_redirect_path` y `should_redirect: true`.

## BAC PowerTranz

Credenciales del bloque `bac-powertranz`: `powertranz_id`, `powertranz_password`, `api_url`, ambiente, Visa Cuotas.

Paso 1 de 3-D Secure. Si hay `redirect_data`, `orders.state` queda `processing` y no se envían webhooks ni correo. El banco vuelve a `/api/bac-step5?bac_request_id=…&user_id=…`. Si el paso 1 sale bien **sin** `redirect_data`, el estado queda `paid`.

`payment_response` incluye `bac_request_id`, `spi_token`, `redirect_data`, `requires_payment` y `requires_3ds_authentication` (este último copia `requires_payment`). El `message` de la orden en éxito de BAC es `Orden creada - Pendiente de autenticación 3D-Secure`.

## Transferencia

No usa `sites.payment_method`. Usa el bloque `transferencias` solo para resolver el `payment_method_id` de Zauru.

Campos: ver [Campos del endpoint](/checkout/campos). Se crean `media` (comprobante) y `bank_transfer_requests`. `orders.state` queda **`paid`**. `payment_response`: `success`, `message`, `bank_transfer_request_id`.

## Visa Cuotas

Checkboxes 3/6/10/12/18/24 y `minimum_amount` (default 1000) en cada bloque de tarjeta. `visaCuotas` en el body. Si el restante no llega al mínimo y se piden cuotas, la pasarela responde error. Si todos los checkboxes van apagados, no se ofrecen cuotas.

## Sin cobro

Sitio sin pasarela y body con los ocho campos de tarjeta y restante > 0: HTTP 400 pidiendo configurar el método de pago en Roplex.

Restante > 0 sin tarjeta ni transferencia: la orden se crea en `pending`, `payment_response` es `null` (o el objeto GiftCard si hubo descuento parcial), `message`: `Orden creada - Pago pendiente`.
