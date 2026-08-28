---
title: Configuración del sitio
sidebar_label: Configuración del sitio
sidebar_position: 3
---

Un **sitio** es la configuración de una tienda en línea. El checkout lee esa configuración para resolver precios, pasarela de pago, integración con Zauru, envíos y correos.

Todo lo de esta página se configura en el admin de Roplex. Nada de esto se envía en el body del checkout.

## Dónde está

En el menú lateral, grupo **Ecommerce** → **Sitios**.

| Acción | Quién puede |
|---|---|
| Ver y editar sitios de su entidad | Usuarios con rol `admin` o `shop_manager` |
| Crear un sitio | Usuarios con rol `admin` o `shop_manager` |
| Borrar un sitio | Solo el super administrador de Roplex |

Cada sitio pertenece a una entidad y solo es visible para los usuarios de esa entidad. Una entidad puede tener varios sitios; el checkout elige cuál usar según el host de la petición, como se explica en [Autenticación](/checkout/autenticacion).

El formulario está dividido en pestañas. Las secciones siguientes usan los nombres exactos de esas pestañas.

## Pestaña: Información General

| Campo | Para qué sirve |
|---|---|
| **Name** | Nombre del sitio. Es el título con el que aparece en el listado. |
| **Description** | Texto libre, opcional. |
| **Agencia de Ecommerce** | Agencia de Zauru desde la que se despacha la tienda. De su lista de precios sale el precio de cada línea de la orden. Si está vacío, el checkout no encuentra precio y rechaza la orden. El selector solo lista agencias marcadas como ecommerce. |
| **URLs de Sitios de Comercio** | Una fila por ambiente. Cada fila tiene **Ambiente** (`production`, `staging` o `development`) y **Link del Sitio de Comercio**. El host de estos links identifica a la tienda y define a dónde se redirige al comprador después de pagar. |
| **Path de Confirmación de Orden** | Path que se concatena al link de comercio después de un pago exitoso, incluido el retorno de 3-D Secure. Por defecto `/confirmacion-de-orden`. Si se deja vacío, se redirige a la raíz del link de comercio. |
| **Path de Error de Pago** | Path que se concatena al link de comercio cuando el pago falla. Por defecto `/pago`. |

> **Nota:** registre el link de cada ambiente en el que vaya a operar. Si el host desde el que llama el checkout no coincide con ninguna fila, Roplex usa el primer sitio de la entidad, que puede no ser el correcto.

## Pestaña: Configuraciones de Zauru

| Campo | Efecto |
|---|---|
| **Recibir descuento extra desde endpoint de ventas** | Habilita que el body del checkout traiga `extra_discount_percent` o `extra_discount_amount`. Apagado por defecto: con el checkbox apagado esos campos se ignoran sin devolver error. Ver [Descuentos](/checkout/descuentos). |
| **Omitir validación de existencias en el checkout** | Con el checkbox activo, el checkout crea la orden aunque la cantidad pedida supere el stock disponible. No cambia el listado de catálogo. Ver [Ítems, precios y stock](/checkout/items-precios-y-stock). |
| **Omitir envío a Zauru** | Con el checkbox activo, la orden y el pago no se envían a Zauru; la integración queda a cargo de los webhooks. **Las gift cards no funcionan en este modo.** |
| **Email del Usuario** | Correo del usuario de Zauru con permisos de ecommerce. Roplex lo usa para autenticarse contra Zauru. |
| **Token** | Token de ese usuario de Zauru. Sin token, la orden no llega a Zauru. |
| **Webhooks de ecommerce** | URLs que reciben por POST la misma información de orden y pago que se envía a Zauru. Cada fila tiene **Nombre** (opcional), **URL del webhook** (obligatoria y debe ser una URL válida) y **Activo** (encendido por defecto). Cada URL recibe una petición independiente. |

Con **Omitir envío a Zauru** activo o sin **Token**, Zauru no recibe la orden. Los webhooks del sitio sí se disparan igual, siempre que estén activos y el pago no esté pendiente de 3-D Secure. Ver [Sincronización con Zauru](/checkout/sincronizacion-con-zauru).

## Pestaña: Configuraciones de Pago

### Método de Pago de Roplex

Un selector con tres opciones: `neo_pay`, `qpaypro` y `bac_powertranz`. Define **cuál** pasarela de tarjeta usa la tienda. Si se deja en blanco, el sitio no cobra con tarjeta.

La transferencia bancaria y las gift cards no dependen de este selector: funcionan en paralelo.

### Bloques de credenciales

Debajo del selector se agregan bloques de configuración, uno por medio de pago. Las credenciales las entrega cada proveedor (NeoNet, QPayPro o BAC); nunca viajan en el body del checkout.

| Bloque | Campos de credenciales |
|---|---|
| **Configuración de NeoPay** | **Ambiente**, **MerchantUser**, **MerchantPasswd**, **TerminalId**, **CardAcqId**, **API URL** |
| **Configuración de QPayPro** | **Ambiente**, **Login ID**, **Private Key**, **API Secret**, **API URL** |
| **Configuración de BAC** | **Ambiente**, **PowerTranz-PowerTranzId**, **PowerTranz-PowerTranzPassword**, **PowerTranz-ApiUrl** |
| **Configuración de Transferencias** | Solo **Ambiente**. No sustituye a los campos de transferencia del body; sirve para resolver el método de pago de Zauru según la moneda. |

**Ambiente** acepta `production`, `staging` o `development` en los cuatro bloques.

### Visa Cuotas

Los tres bloques de tarjeta incluyen una sección plegable **Visa Cuotas**:

- **Monto mínimo**: monto a partir del cual se pueden ofrecer cuotas. Por defecto `1000`.
- Checkboxes **3 cuotas**, **6 cuotas**, **10 cuotas**, **12 cuotas**, **18 cuotas** y **24 cuotas**.

Si deja todos los checkboxes apagados, la tienda no ofrece cuotas. Si el comprador pide cuotas y el monto no alcanza el mínimo, la pasarela rechaza el cobro.

### Mapeo de monedas a métodos de pago

Los cuatro bloques terminan con el arreglo **Mapeo de monedas a métodos de pago**. Cada fila asocia una **Moneda** con un **Método de pago** de Zauru.

Este mapeo es obligatorio: sin una fila para la moneda de la orden, el checkout responde HTTP 400 con `No hay un método de pago configurado para la moneda…`.

El selector de **Método de pago** solo lista los métodos de Zauru marcados como ecommerce cuya moneda coincide con la de la fila. Si un método no aparece en la lista, revísele esa configuración en **Management → Métodos de Pago**.

Ver [Pasarelas de pago](/checkout/pasarelas-de-pago) para el detalle de cada cobro.

## Pestaña: Configuraciones de Email

| Campo | Efecto |
|---|---|
| **Enviar correos de orden al cliente** | Encendido por defecto. Apagarlo omite el correo automático al cliente después del checkout y después del pago confirmado. El reenvío manual desde el admin sigue funcionando y los correos de anulación no se ven afectados. |
| **Email de la Entidad** | Recibe una copia de cada pedido de la tienda. |
| **Responder email a** | Dirección de respuesta que ve el cliente. |
| **Asunto del correo de confirmación al cliente** | Asunto del correo que recibe el cliente al confirmar su orden. |
| **Asunto del correo de despacho (interno)** | Asunto del correo interno que recibe la empresa cuando entra un pedido nuevo. |
| **Asunto del correo de anulación / voucher de cancelación** | Asunto del correo que recibe el cliente cuando se anula su orden. |

Los tres asuntos aceptan variables, listadas en el propio formulario:

| Variable | Contenido |
|---|---|
| `{{nombre_empresa}}` | Nombre de la empresa o tienda |
| `{{nombre_cliente}}` | Nombre completo del cliente que hizo el pedido |
| `{{numero_orden}}` | Número único de la orden |

Ejemplo de asunto:

```text
[{{nombre_empresa}}] Gracias {{nombre_cliente}} — Orden #{{numero_orden}}
```

Si deja un asunto vacío, el correo sale con el asunto predeterminado de la plantilla.

Con NeoPay y con BAC el correo no se encola en el checkout: se envía al completarse la autenticación 3-D Secure. Ver [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure).

## Pestaña: Webstudio Links

Links auxiliares de la tienda, que el checkout no usa:

- **Link del Sitio de Registro en Webstudio**
- **Link del Sitio de Contenido en Webstudio**

## Lo que el sitio no configura

Las zonas, métodos y reglas de envío se configuran aparte, en el grupo **Shipping** del menú, y pertenecen a la entidad, no al sitio. Un método de envío puede restringirse a sitios concretos desde su propio campo **Sitios**. Ver [Envíos](/checkout/envios).

## Troubleshooting

**`No hay un método de pago configurado para la moneda…`**
Falta la fila de esa moneda en **Mapeo de monedas a métodos de pago** del bloque activo. Agréguela en la pestaña **Configuraciones de Pago**.

**El checkout responde que no hay precio sugerido para un ítem**
El sitio no tiene **Agencia de Ecommerce**, o la lista de precios de esa agencia no tiene un precio vigente para ese ítem. Ver [Ítems, precios y stock](/checkout/items-precios-y-stock).

**La orden se crea pero Zauru nunca la recibe**
Revise que **Omitir envío a Zauru** esté apagado y que **Token** y **Email del Usuario** estén completos en la pestaña **Configuraciones de Zauru**.

**Después de pagar, el comprador aterriza en el sitio equivocado**
El host desde el que se llamó al checkout no coincide con ninguna fila de **URLs de Sitios de Comercio** para el ambiente actual. Agregue la fila correspondiente.

**El comprador no recibe el correo de confirmación**
Revise **Enviar correos de orden al cliente** en la pestaña **Configuraciones de Email**. Si el pago fue con tarjeta y quedó pendiente de 3-D Secure, el correo sale hasta que la autenticación termina.
