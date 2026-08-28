---
title: Documentación de Roplex
sidebar_label: Inicio
sidebar_position: 1
slug: /
---

Roplex es el CMS headless ecommerce de Zauru. No es la tienda visual ni el ERP: se sienta en el medio.

| Sistema | Rol |
|---|---|
| **Zauru (ERP)** | Fuente de verdad de catálogo, existencias, precios, agencias, gift cards y facturación. Recibe `ecommerce_requests` cuando una orden se cobra. |
| **Roplex** | Admin Payload, GraphQL de catálogo, carrito, checkout, pasarelas, envíos. Persiste órdenes y logs de pago. |
| **Webstudio** | Storefront visual. Consume GraphQL y REST. Tras 3-D Secure redirige a paths del sitio. |

Roplex no factura, no mueve inventario y no es un punto de venta. El stock visible es un espejo de Zauru. Los compradores no inician sesión en Roplex: la tienda usa un usuario Payload con API key.

Esta documentación cubre a fondo el único punto de cobro de la tienda: `POST /api/orders/create-ecommerce-order`, más la configuración que ese endpoint necesita para funcionar.

- [Checkout](/checkout): flujo de la orden, autenticación, sitio, campos, pagos y sincronización con Zauru.
