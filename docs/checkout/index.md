---
title: Crear una orden ecommerce
sidebar_label: Crear una orden ecommerce
sidebar_position: 1
---

El único punto de cobro de la tienda es:

```
POST /api/orders/create-ecommerce-order
```

El handler vive en la colección `orders` de Payload. Acepta JSON o `multipart/form-data` (este último es obligatorio si se adjunta comprobante de transferencia). Las claves del body son planas, no anidadas. El precio de cada línea no lo envía el cliente: sale de `suggested_prices` de la lista de precios de la agencia ecommerce del sitio.

## Qué hace la petición

1. Autenticar al usuario de la API key y exigir `selected_entity` como objeto (no un id suelto).
2. Parsear el body (JSON o form-data) y recortar espacios en todos los strings.
3. Inferir si hay pago con tarjeta o con transferencia según los campos presentes.
4. Resolver ítems y bundles (`item`/`item1`/… emparejados con `quantity`/`quantity1`/…).
5. Resolver el [sitio](/checkout/configuracion-del-sitio) con `getSiteForUser` y el host de `Origin` o `Referer`.
6. Tomar precios de la lista de la agencia ecommerce y convertir a la moneda de cobro.
7. Calcular envío, salvo `store_pickup`.
8. Aplicar descuento extra si el sitio lo permite.
9. Cotizar y aplicar hasta dos GiftCards.
10. Cobrar el restante con tarjeta **o** transferencia (no ambos), o dejar la orden sin cobro.
11. Validar existencias, salvo `skip_stock_validation`.
12. Crear o actualizar el cliente en `ecommerce_clients`.
13. Persistir `orders` + `order_details`.
14. Encolar correo (salvo 3-D Secure pendiente) y enviar a Zauru y/o webhooks (salvo 3-D Secure pendiente).

El `id` de la orden es un UUID generado al crear el documento.

## Páginas de esta sección

- [Autenticación](/checkout/autenticacion): API key, entidad y resolución del sitio por host.
- [Configuración del sitio](/checkout/configuracion-del-sitio): campos de `sites` que el endpoint lee.
