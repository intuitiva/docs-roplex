---
title: Documentación de Roplex
sidebar_label: Inicio
sidebar_position: 1
slug: /
---

Roplex es el CMS headless de ecommerce de Zauru. No es la tienda visual ni el ERP: se sienta en el medio.

| Sistema | Rol |
|---|---|
| **Zauru (ERP)** | Fuente de verdad de catálogo, existencias, precios, agencias, gift cards y facturación. Recibe la orden cuando se cobra. |
| **Roplex** | Administración de la tienda, catálogo por GraphQL, carrito, checkout, pasarelas de pago y envíos. Guarda las órdenes y el registro de los cobros. |
| **Webstudio** | Storefront visual. Consume el catálogo y el checkout de Roplex. Después de 3-D Secure, recibe al comprador de vuelta. |

Roplex no factura, no mueve inventario y no es un punto de venta. El stock que muestra es un espejo de Zauru. Los compradores no inician sesión en Roplex: la tienda llama a la API con una clave propia.

## Para quién es esta documentación

Para programadores que integran una tienda con Roplex desde otra empresa. Se asume que usted tiene:

- **Una clave de API** de Roplex, para llamar a los endpoints y al catálogo GraphQL.
- **Acceso al admin de Roplex**, con rol `admin` o `shop_manager`, limitado a su propia entidad.

No se asume acceso al código de Roplex. Todo lo que aparece aquí es observable desde la API o desde la pantalla del admin.

Cuando la documentación menciona una configuración, la nombra por su **pestaña y su etiqueta en pantalla**. Cuando menciona un campo de un endpoint, usa el nombre exacto que viaja en la petición o en la respuesta.

## Qué cubre

El punto de cobro de la tienda:

```text
POST /api/orders/create-ecommerce-order
```

Más la configuración que ese endpoint necesita para funcionar, el flujo de autenticación de las tarjetas y la cotización de gift cards.

- [Checkout](/checkout): flujo de la orden, autenticación, configuración del sitio, campos, pagos, 3-D Secure y sincronización con Zauru.
