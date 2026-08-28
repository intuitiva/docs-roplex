---
title: Pasarelas de pago
sidebar_label: Pasarelas de pago
sidebar_position: 10
---

El sitio elige **una** pasarela de tarjeta en **Método de Pago de Roplex**, con tres opciones posibles: `neo_pay`, `qpaypro` o `bac_powertranz`. Si el selector está vacío, el sitio no cobra con tarjeta.

La transferencia bancaria y las gift cards no dependen de ese selector: funcionan en paralelo.

## Cómo se elige el medio de cobro

El body no manda el nombre de la pasarela. Si llegan los ocho campos de tarjeta, se usa la pasarela configurada en el sitio. Si llegan los de transferencia, se registra un comprobante bancario. No se pueden combinar tarjeta y transferencia para cubrir el mismo restante.

Ver [Campos del endpoint](/checkout/campos#cómo-se-decide-el-medio-de-pago).

## Monedas admitidas

Antes de cobrar, Roplex valida el `currency_id` de la orden contra el bloque de configuración activo:

| Bloque en el sitio | Monedas que acepta |
|---|---|
| **Configuración de NeoPay** | GTQ |
| **Configuración de BAC** | GTQ |
| **Configuración de QPayPro** | GTQ o USD |
| **Configuración de Transferencias** | Cualquiera |

NeoPay y BAC cobran **siempre en GTQ**. Si los ítems están en otra moneda, el restante se convierte a GTQ con las **Tasas de Cambio** de la entidad. QPayPro cobra en GTQ o USD según el método mapeado.

Dos rechazos posibles, ambos HTTP 400:

- La moneda no es compatible con la pasarela.
- El bloque no tiene fila para esa moneda en **Mapeo de monedas a métodos de pago**: `No hay un método de pago configurado para la moneda…`.

Sin tasa de cambio para convertir a la moneda de la pasarela, la respuesta también es HTTP 400. A diferencia del precio de los ítems, aquí no hay respaldo: el cobro no puede continuar.

## Dirección de facturación de la tarjeta

Cuando hay cobro con tarjeta, Roplex arma la dirección de facturación con estos datos:

| Dato en la pasarela | De dónde sale |
|---|---|
| Nombre y apellido | `firstName` y `lastName` del body |
| Correo y teléfono | Del cliente de la orden |
| Dirección | `address_line_1` |
| Municipio | `city` |
| Departamento | Código del estado resuelto a partir de `state` |
| Código postal | Código postal del **estado**, no el `postal_code` del body |
| País | País del estado resuelto |

Si esa dirección no pasa la validación, la respuesta es HTTP 400 con el detalle de qué falta.

## NeoPay

Credenciales en el bloque **Configuración de NeoPay** del sitio.

American Express no se procesa: HTTP 400 con `American Express no es soportado por NeoPay`.

El cobro **no termina en la respuesta del checkout**. La respuesta 200 abre el flujo de 3-D Secure y trae `neo_pay_request_id`, `access_token` y `device_data_collection_url`. La orden queda en estado `processing`, y ni el correo ni el envío a Zauru se disparan todavía.

La tienda debe completar los pasos siguientes. El flujo completo está en [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure).

## QPayPro

Credenciales en el bloque **Configuración de QPayPro** del sitio.

Es la única pasarela que resuelve el cobro dentro de la propia llamada al checkout. Si el cobro sale bien, la orden queda `paid` y el `message` es `Orden creada - Pago exitoso`. La respuesta trae:

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

`redirect_url` apunta a **su tienda**, no a Roplex: es a donde debe llevar al comprador. Solo viene cuando el cobro fue exitoso y `should_redirect` es `true`.

Si el cobro falla, la respuesta es HTTP 400 o 500 e incluye `qpaypro_response` con un `redirect_url` hacia el **Path de Error de Pago** del sitio.

## BAC PowerTranz

Credenciales en el bloque **Configuración de BAC** del sitio.

Como NeoPay, el cobro arranca en el checkout y termina después de la autenticación del banco. La respuesta 200 trae `bac_request_id`, `spi_token`, `redirect_data`, `requires_payment` y `requires_3ds_authentication`, y el `message` es `Orden creada - Pendiente de autenticación 3D-Secure`.

> **Advertencia:** no use `requires_3ds_authentication` para decidir si hay que autenticar. Hoy siempre llega en `false`. Use la presencia de `redirect_data`.

Con `redirect_data` la orden queda `processing` y no se envían correo ni webhooks. Sin `redirect_data`, la orden queda `paid`. Ver [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure).

## Transferencia bancaria

No usa **Método de Pago de Roplex**. Usa el bloque **Configuración de Transferencias** únicamente para resolver el método de pago de Zauru según la moneda.

Roplex guarda el comprobante adjunto y registra la solicitud de transferencia. La orden queda **`paid`** de inmediato, sin verificación previa del depósito.

```json
{
  "success": true,
  "message": "…",
  "bank_transfer_request_id": 1
}
```

Los campos del body están en [Campos del endpoint](/checkout/campos#transferencia).

## Visa Cuotas

Cada bloque de tarjeta tiene su propia sección **Visa Cuotas**, con un **Monto mínimo** (1000 por defecto) y checkboxes de 3, 6, 10, 12, 18 y 24 cuotas.

La tienda pide cuotas con el campo `visaCuotas` del body. Si el restante a cobrar no alcanza el mínimo, la pasarela responde error. Si todos los checkboxes están apagados, no se ofrecen cuotas.

## Órdenes sin cobro

Dos casos:

| Situación | Resultado |
|---|---|
| Llegan los ocho campos de tarjeta, hay restante mayor a 0 y el sitio no tiene **Método de Pago de Roplex** | HTTP 400 pidiendo configurar el método de pago en Roplex |
| Hay restante mayor a 0 y no llegan campos de tarjeta ni de transferencia | La orden se crea en `pending`, con `message` `Orden creada - Pago pendiente` y `payment_response` en `null` |

## Troubleshooting

**HTTP 400 `No hay un método de pago configurado para la moneda…`**
Falta la fila de esa moneda en **Mapeo de monedas a métodos de pago**, en el bloque de la pasarela activa.

**HTTP 400 al convertir a GTQ**
No hay tasa de cambio entre la moneda de la orden y GTQ en las **Tasas de Cambio** de la entidad. NeoPay y BAC no pueden cobrar sin ella.

**HTTP 400 `American Express no es soportado por NeoPay`**
Es una limitación de la pasarela. Si necesita Amex, use QPayPro o BAC.

**El cobro con cuotas se rechaza**
El restante no alcanza el **Monto mínimo** del bloque, o el número de cuotas pedido no está habilitado con su checkbox.

**La respuesta llegó con éxito pero la orden sigue en `processing`**
Es lo normal con NeoPay y con BAC cuando trae `redirect_data`. El cobro se completa después de la autenticación del banco.
