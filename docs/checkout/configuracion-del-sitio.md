---
title: Configuración del sitio
sidebar_label: Configuración del sitio
sidebar_position: 3
---

Un **sitio** (`sites`) es la configuración de una tienda en línea de la entidad. El checkout lee este documento para precios, pasarela, Zauru, envíos y correo. Se edita en el admin de Roplex, pestaña a pestaña.

## Información general

- **name**: nombre del sitio. Se usa como título en el admin.
- **description**: texto opcional.
- **ecommerce_agency**: agencia de Zauru marcada `ecommerce`. De ella sale la lista de precios (`price_list`) con la que el checkout busca `suggested_prices` current. Si falta, no hay precio y la orden se rechaza.
- **url_commerce**: arreglo de URLs de Webstudio. Cada fila tiene `environment` (`production`, `staging`, `development`) y `link`. El host de `link` en el ambiente `APP_ENV` se usa para [resolver el sitio](/checkout/autenticacion) cuando la entidad tiene más de uno.
- **success_redirect_path**: path concatenado al URL de comercio tras un pago exitoso (incluido el retorno 3-D Secure). Por defecto `/confirmacion-de-orden`. Vacío = redirigir al URL de comercio.
- **error_redirect_path**: path concatenado al URL de comercio cuando el pago falla. Por defecto `/pago`.
- **entity**: relación a la entidad. La asigna el sistema; no se envía en el checkout.

## Configuraciones de Zauru

- **accept_extra_discount_from_endpoint**: si está activo, el body puede traer `extra_discount_percent` o `extra_discount_amount`. Ver [Descuentos](/checkout/descuentos).
- **skip_stock_validation**: si está activo, el checkout no exige `available + incoming` en agencias ecommerce. El listado GraphQL no cambia. Ver [Ítems, precios y stock](/checkout/items-precios-y-stock).
- **skip_zauru_sync**: si está activo, la orden y el pago no se envían a Zauru. La integración queda en webhooks u otros sistemas. **GiftCard no se puede usar** en este modo.
- **user_email**: correo del usuario de Zauru con permisos ecommerce. Header `X-User-Email` al POST de `ecommerce_requests`.
- **token**: token de ese usuario. Header `X-User-Token`.
- **ecommerce_webhooks**: URLs que reciben por POST el mismo cuerpo de orden y pago que iría a Zauru. Cada URL es una petición independiente. Campos por fila: `label` (opcional), `url` (obligatoria, URL válida), `enabled` (por defecto activo).

Sin `token` o con `skip_zauru_sync`, Zauru no recibe la orden. Los webhooks del sitio sí se disparan si están activos y no hay 3-D Secure pendiente.

## Configuraciones de pago

- **payment_method**: pasarela de tarjeta del sitio. Valores: `neo_pay`, `qpaypro`, `bac_powertranz`. Vacío = no se cobra con tarjeta.
- **payment_methods**: bloques de credenciales. Puede haber un bloque por tipo:
  - **neo_pay**: `environment`, `merchant_user`, `merchant_passwd`, `terminal_id`, `card_acq_id`, `api_url`, Visa Cuotas, mapeo moneda → método Zauru.
  - **qpaypro**: `environment`, `x_login`, `x_private_key`, `x_api_secret`, `api_url`, Visa Cuotas, mapeo.
  - **bac-powertranz**: `environment`, `powertranz_id`, `powertranz_password`, `api_url`, Visa Cuotas, mapeo.
  - **transferencias**: `environment` y mapeo. No sustituye los campos `trans*` del body; sirve para resolver el `payment_method_id` de Zauru según la moneda.

Visa Cuotas (en cada pasarela de tarjeta): `minimum_amount` (por defecto 1000) y checkboxes `3_cuotas`, `6_cuotas`, `10_cuotas`, `12_cuotas`, `18_cuotas`, `24_cuotas`. Si todas van en blanco, no se ofrecen cuotas.

El mapeo `currency_payment_methods` asocia cada moneda con un método de pago de Zauru marcado `ecommerce` y con el mismo `currency_id`. El checkout usa esa fila para el `payment_method_id` que viaja a Zauru.

Las credenciales las proporciona cada pasarela (NeoNet, QPayPro o BAC). No se envían en el body del checkout.

## Correo

- **send_customer_order_emails**: por defecto activo. Si está apagado, no se encola el correo automático al cliente (confirmación de checkout ni voucher tras pago de pasarela). El reenvío desde admin sí envía. Los vouchers de anulación no se ven afectados.
- **entity_email**: copia de cada pedido a este correo.
- **reply_to_email**: remitente de respuesta para el cliente.
- **confirmation_email_subject**, **dispatch_email_subject**, **cancellation_email_subject**: asuntos. Si van vacíos, el mailer de Zauru usa el asunto del template.

El checkout encola el correo por SQS salvo cuando el pago de tarjeta queda pendiente de 3-D Secure (NeoPay siempre; BAC cuando hay `redirect_data`).

## Lo que el sitio no configura

Zonas, métodos y reglas de envío viven en colecciones `shipping_*` de la entidad, no en el sitio. El sitio solo se pasa a `calculateShippingCost` para filtrar métodos asociados. Ver [Envíos](/checkout/envios).
