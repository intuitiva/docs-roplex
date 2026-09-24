---
title: Crear una orden ecommerce
sidebar_label: Crear una orden ecommerce
sidebar_position: 1
---

El punto de cobro de la tienda es:

```text
POST /api/orders/create-ecommerce-order
```

Acepta `application/json` o `multipart/form-data`; este último es obligatorio si adjunta el comprobante de una transferencia. Las claves del body son **planas**, no anidadas.

El precio de cada línea no lo envía la tienda: sale de la lista de precios de la agencia de ecommerce configurada en el sitio.

## Qué hace la petición

1. Valida la clave de API y su entidad seleccionada.
2. Lee el body y recorta los espacios de todos los valores de texto.
3. Deduce si el cobro es con tarjeta o con transferencia, según los campos presentes.
4. Resuelve las líneas de ítems y paquetes, emparejando `item*` con `quantity*`.
5. Resuelve el [sitio](/checkout/configuracion-del-sitio) a partir del host de la petición.
6. Toma los precios de la lista de la agencia de ecommerce y los convierte a la moneda de cobro.
7. Calcula el envío, salvo que sea recolección en tienda.
8. Aplica el descuento extra, si el sitio lo permite.
9. Cotiza y aplica hasta dos gift cards.
10. Cobra el restante con tarjeta **o** con transferencia, o deja la orden sin cobro.
11. Valida existencias, salvo que el sitio lo omita.
12. Crea o actualiza el cliente.
13. Guarda la orden y sus líneas.
14. Encola el correo y envía la orden a Zauru y a los webhooks, salvo que el pago esté pendiente de 3-D Secure.

El `order_id` de la respuesta es un UUID. Guárdelo: es el identificador de la orden en todos los pasos posteriores.

## Un detalle importante antes de empezar

Con tarjeta, **el cobro no termina en esta llamada**. NeoPay y BAC devuelven 200 con la orden creada y el cobro apenas iniciado, en estado `Procesando`. La tienda debe completar la autenticación del banco. Solo QPayPro, la transferencia y las gift cards resuelven el cobro dentro de la propia petición.

Ver [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure) antes de implementar el pago con tarjeta.

## Páginas de esta sección

- [Autenticación](/checkout/autenticacion): clave de API, entidad y resolución del sitio por host.
- [Configuración del sitio](/checkout/configuracion-del-sitio): qué configurar en el admin para que el checkout funcione.
- [Campos del endpoint](/checkout/campos): inventario del body, con tipos y ejemplos.
- [Ítems, precios y stock](/checkout/items-precios-y-stock): cómo se arman las líneas y de dónde sale el precio.
- [Envíos](/checkout/envios): zonas, métodos, reglas y recolección en tienda.
- [Descuentos](/checkout/descuentos): `extra_discount_percent` y `extra_discount_amount`.
- [GiftCards](/gift-cards): consultar saldo y aplicar hasta dos tarjetas por orden.
- [Pasarelas de pago](/checkout/pasarelas-de-pago): NeoPay, QPayPro, BAC PowerTranz y transferencia.
- [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure): cómo completar el cobro con tarjeta.
- [Respuestas y errores](/checkout/respuestas-y-errores): la respuesta 200 y los cuerpos de error.
- [Sincronización con Zauru](/checkout/sincronizacion-con-zauru): qué reciben Zauru y los webhooks del sitio.
