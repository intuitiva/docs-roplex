---
title: GiftCards
sidebar_label: Introducción
sidebar_position: 1
slug: /gift-cards
---

Roplex permite consultar el saldo de una GiftCard y aplicar hasta **dos**
GiftCards al crear una orden ecommerce. Las tarjetas, sus monedas y sus saldos
se sincronizan desde Zauru.

## Flujo recomendado

1. Obtenga el total final de la orden, incluido el envío y descontado cualquier
   descuento extra.
2. Consulte la primera GiftCard con
   `POST /api/orders/gift-card-quote`.
3. Si la primera no cubre todo, consulte la segunda usando como `order_total`
   el `remaining_amount` de la primera respuesta.
4. Envíe una o las dos tarjetas a
   `POST /api/orders/create-ecommerce-order`.
5. Tome la respuesta del checkout como el cálculo definitivo de los montos
   aplicados. La cotización no reserva saldo y el checkout vuelve a validar cada
   tarjeta. El saldo solo cambia después de que Zauru acepta la orden.

## Qué valor representa cada saldo

La respuesta de cotización contiene valores parecidos que no deben
confundirse:

| Campo | Qué representa |
|---|---|
| `available_balance` | Saldo actual de la GiftCard, en la moneda de la tarjeta |
| `available_balance_target_currency` | El mismo saldo convertido a la moneda de la orden |
| `applicable_amount` | Monto que la tarjeta cubriría de esa orden |
| `remaining_amount` | Monto de la **orden** que todavía quedaría por cobrar |

El endpoint no devuelve una clave específica con el saldo que le quedaría a la
tarjeta. Puede calcular ese valor proyectado así:

```text
saldo proyectado de la GiftCard =
  available_balance - applicable_amount_in_gift_card_currency
```

El resultado es solo una proyección hasta que Zauru acepta la orden.

## Consulta y redención son operaciones distintas

| | Consultar o cotizar | Crear la orden |
|---|---|---|
| Endpoint | `POST /api/orders/gift-card-quote` | `POST /api/orders/create-ecommerce-order` |
| Tarjetas por petición | Una | Hasta dos |
| Crea una orden | No | Sí |
| Reserva saldo | No | No |
| Descuenta saldo | No | Después de que Zauru acepta la orden |
| Exige integración activa con Zauru | No | Sí |
| Límite específico de consultas | Sí | No |

## Páginas de esta sección

- [Consultar saldo y cotizar](/gift-cards/consultar-saldo): request, respuesta,
  monedas, cálculo del saldo proyectado, dos tarjetas y límite de intentos.
- [Usar GiftCards en el checkout](/gift-cards/usar-en-checkout): campos de
  `create-ecommerce-order`, orden de aplicación, combinación con otros medios,
  respuestas y momento del descuento.

## Reglas comunes

- La búsqueda del código es exacta, distingue mayúsculas y está limitada a la
  entidad de la clave de API.
- Solo se aceptan tarjetas emitidas, no anuladas y con saldo mayor que 0.
- Si la moneda de la GiftCard es distinta de la moneda de la orden, debe existir
  una tasa de cambio para la entidad.
- Roplex no valida la fecha de vencimiento al cotizar ni al crear la orden.
- Una cotización exitosa no garantiza la redención: el saldo o la configuración
  pueden cambiar antes del checkout.
