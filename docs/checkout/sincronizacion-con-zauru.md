---
title: Sincronización con Zauru
sidebar_label: Sincronización con Zauru
sidebar_position: 13
---

Después de guardar la orden, Roplex arma un único paquete de datos y lo envía a dos destinos: a Zauru y a cada webhook configurado en el sitio. El cuerpo es idéntico en ambos casos.

La excepción es el pago con tarjeta pendiente de 3-D Secure. En ese caso el envío se difiere hasta que la autenticación termina. Ver [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure).

El resultado de cada envío —URL, cuerpo enviado, respuesta, código de estado y duración— queda registrado en **External Integrations → Respuestas de Webhooks** del admin.

## Cuándo se envía a Zauru

Se intenta el envío si se cumplen las tres condiciones, todas en la pestaña **Configuraciones de Zauru** del sitio:

1. Se resolvió un sitio para la petición.
2. **Omitir envío a Zauru** está apagado.
3. **Token** está lleno.

El correo con el que Roplex se identifica ante Zauru es el de **Email del Usuario**; si está vacío, se usa el del usuario de la clave de API.

Se considera éxito una respuesta 200 o 201 de Zauru.

**Roplex no espera a que Zauru facture para responder 200 a la tienda.** Si Zauru falla, la orden ya existe en Roplex y se puede reenviar.

> **Nota:** si el primer intento falla y el paquete traía datos de gift card o el monto del pago, Roplex reintenta una vez sin esos campos, por si el ERP todavía no los acepta.

## Webhooks del sitio

Cada fila de **Webhooks de ecommerce** con **Activo** encendido y una URL válida recibe una petición POST independiente, con el mismo cuerpo que se envía a Zauru.

Los webhooks se disparan **aunque Omitir envío a Zauru esté activo**. Esa es justamente la forma de integrar Roplex con otro sistema sin pasar por Zauru.

Que una URL falle no cancela las demás. Los webhooks no llevan las credenciales de Zauru.

## Estructura del cuerpo

El cuerpo tiene tres bloques. `client` y `order` siempre están presentes. `payment` solo aparece si hubo un cobro resuelto: pasarela aprobada o transferencia registrada.

### client

| Campo | Contenido |
|---|---|
| `name`, `email`, `phone` | Datos del comprador |
| `tin` | NIT. `CF` si no se envió |
| `address_line_1` y `delivery_address` | Ambos con la dirección de entrega |
| `notes` | Siempre `"Creado desde Roplex"` |

### order

| Campo | Contenido |
|---|---|
| `date` | Fecha y hora del envío, en formato ISO |
| `order_number` | UUID de la orden en Roplex |
| `extra_discount` | Descuento extra aplicado |
| `gift_card_discount`, `gift_card_1_id_number`, `gift_card_2_id_number`, `gift_card_1_discount`, `gift_card_2_discount` | Datos de las gift cards aplicadas |
| `remaining_gateway_amount` | Monto que se cobró por pasarela o transferencia |
| `reference` | Referencia de la orden y referencia del pago, unidas con ` - ` |
| `memo` | Memo del pago y memo de la orden, unidos |
| `delivery_instructions` | Instrucciones de entrega |
| `city_id`, `city_name`, `state_id` | Solo si la ubicación se pudo resolver |
| `invoice_details_attributes` | Una entrada por línea de la orden |

Cada entrada de `invoice_details_attributes` trae `item_id`, `item_code` e `item_name` para ítems, o `bundle_id`, `bundle_code` y `bundle_name` para paquetes, más `quantity` y `unit_price`. Los precios ya vienen en la moneda de cobro e incluyen la línea de envío si la hubo.

### payment

| Campo | Contenido |
|---|---|
| `reference`, `receipt`, `memo` | Datos del cobro aprobado o del comprobante de transferencia |
| `amount` | Monto cobrado por pasarela o transferencia |
| `payment_method_id` | Método de pago de Zauru resuelto con el **Mapeo de monedas a métodos de pago** del bloque activo |
| `image_url` | URL del comprobante. Solo en transferencias |

## Reenviar una orden

En el admin, abra la orden en **Ecommerce → Ordenes** y use el botón **Reenviar orden a Zauru** del menú de acciones del documento.

El reenvío usa el host guardado con la orden, no el del admin, así que los redirects y los webhooks salen hacia el sitio correcto. El resultado aparece en **Respuestas de Webhooks**.

## Gift cards y Zauru

El saldo de una GiftCard en Roplex se descuenta **solo si Zauru aceptó la
orden**. Si el envío falla, los montos quedan registrados en la orden pero el
saldo no se mueve. Ver
[Cuándo se descuenta el saldo](/gift-cards/usar-en-checkout#cuándo-se-descuenta-el-saldo).

## Correo

El correo al comprador es un canal aparte del envío a Zauru y de los webhooks. Se encola al crear la orden cuando el cobro se resolvió en esa misma llamada: gift cards que cubren el total, transferencia, QPayPro exitoso, o una orden sin cobro.

Con NeoPay y con BAC el correo no sale en el checkout. Se envía cuando termina la autenticación 3-D Secure. Ver la tabla de [estados, correo y sincronización](/checkout/autenticacion-3d-secure#estados-correo-y-sincronización).

Si **Enviar correos de orden al cliente** está apagado en el sitio, el correo automático no se encola; el reenvío manual desde el admin sigue funcionando. Los asuntos vacíos se completan con el asunto predeterminado de la plantilla. Ver [Configuración del sitio](/checkout/configuracion-del-sitio#pestaña-configuraciones-de-email).

## Troubleshooting

**La orden se creó pero Zauru no la tiene**
Revise las tres condiciones de arriba en la pestaña **Configuraciones de Zauru**. Después revise **Respuestas de Webhooks** para ver qué respondió Zauru.

**Los webhooks reciben la orden pero Zauru no**
Es el comportamiento esperado con **Omitir envío a Zauru** activo, o cuando falta **Token**.

**Ni Zauru ni los webhooks recibieron nada, y la orden aparece en Procesando**
El pago está pendiente de 3-D Secure. El envío ocurre cuando el comprador completa la autenticación.

**Zauru rechazó el envío por campos desconocidos**
Roplex reintenta automáticamente sin los campos de gift card y sin el monto del pago. Si el segundo intento también falla, es una diferencia de versión con el ERP.
