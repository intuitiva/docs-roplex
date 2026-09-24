---
title: Campos del endpoint
sidebar_label: Campos del endpoint
sidebar_position: 4
---

Inventario completo del body de `POST /api/orders/create-ecommerce-order`.

El body es un objeto **plano**: no hay objetos anidados ni arreglos. Todos los valores de texto se recortan de espacios antes de validarse.

## Content-Type

| Content-Type | Cuándo usarlo |
|---|---|
| `application/json` | Caso normal. Sirve para ítems, gift cards y tarjeta. |
| `multipart/form-data` | **Obligatorio** si adjunta el comprobante de transferencia. Cada campo se envía con la misma clave plana; `transFile` puede repetirse para enviar varios archivos. |

Errores de formato:

| HTTP | Cuerpo | Causa |
|---|---|---|
| 400 | `{ "message": "No body" }` | La petición no trae body |
| 400 | `{ "message": "FormData not available" }` | Petición multipart que no se pudo leer |

## Cómo se decide el medio de pago

**No existe un campo `payment_method` en el body.** El medio de cobro se infiere de los campos presentes:

| Se infiere | Cuando llegan |
|---|---|
| Tarjeta | Los ocho campos: `cardNumber`, `cardExpirationDate`, `cardCvv`, `firstName`, `lastName`, `address_line_1`, `state`, `city` |
| Transferencia | `transName`, `transBank` y `transDate`. Para completar el cobro también exige `transNumber` y `transFile` |

Reglas de combinación:

- Si las gift cards cubren el total, no se cobra nada más.
- Si queda un restante mayor a 0 y llegan campos de tarjeta **y** de transferencia, HTTP 400: solo se acepta uno de los dos.
- Si no llega ninguno de los dos, la orden se crea en estado pendiente.

## Cliente

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | string | Sí | Nombre del cliente. Si el correo ya existe en la entidad, el cliente se actualiza. |
| `email` | string | Sí | Clave de búsqueda del cliente, en minúsculas. Crea o actualiza el cliente de la entidad. |
| `phone` | string | No | Se conservan solo los dígitos. Se guarda en el cliente y en la orden. |
| `tin` | string | No | NIT. Si falta, se usa `"CF"`. |

Si el cliente no se puede crear, HTTP 400 con `Error en los datos del cliente, vuelva a intentarlo`.

## Líneas

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `item`, `item1`, `item2`, … | string | Sí, al menos uno | Id numérico de un ítem, o `b` + id de un paquete. Ejemplo: `b12`. |
| `quantity`, `quantity1`, … | string | Sí | Cantidad de la línea cuyo `item*` tiene el mismo sufijo. |

El precio unitario **no se envía**. Ver [Ítems, precios y stock](/checkout/items-precios-y-stock).

## Dirección y envío

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `address_line_1` | string | Sí para tarjeta | Dirección de entrega. También se usa como dirección de facturación de la tarjeta. |
| `delivery_instructions` | string | No | Se guarda en la orden y viaja a Zauru y a los webhooks. |
| `store_pickup` | string \| boolean | No | Con `true`, `"true"` o `"1"` no se calcula envío y el memo incluye `Recolección en tienda`. Cualquier otro valor calcula envío. |
| `state` | number | Sí para tarjeta | Id del estado o departamento. Para tarjeta debe ser numérico. |
| `city` | string \| number | Sí para tarjeta | Id numérico del municipio, o su nombre exacto. |
| `postal_code` | string | No | Se guarda, pero hoy ninguna regla de envío lo evalúa. En el cobro con tarjeta, la dirección de facturación usa el código postal del **estado**, no este campo. |
| `coupon` | string | No | Código de cupón para reglas de envío de tipo **Cupón**. |

Ver [Envíos](/checkout/envios).

### De dónde salen los ids de estado y ciudad

Los catálogos geográficos se pueden consultar sin clave de API:

```bash
# Estados de un país
curl "https://<host-roplex>/api/states?where[country][equals]=1&limit=100"

# Municipios de un estado
curl "https://<host-roplex>/api/cities?where[state][equals]=123&limit=200"
```

Use el `id` de la respuesta. Si prefiere enviar el nombre del municipio en `city`, debe coincidir exactamente con el registrado, o el envío no encuentra la zona.

## Moneda, descuento y memo

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `currency_id` | number | No | Id de la moneda de cobro. Si no existe, HTTP 400. Si se omite, se usa la moneda de la entidad. |
| `extra_discount_percent` | number | No | Porcentaje de descuento sobre el total. Excluyente con el siguiente. |
| `extra_discount_amount` | number | No | Monto fijo de descuento. Excluyente con el anterior. |
| `memo` | string | No | Texto libre. Roplex le concatena las notas de conversión de moneda, recolección en tienda, tipo de cambio del pago y gift cards. |
| `reference` | string | No | Referencia de la orden. Por defecto vacío. |

Los dos campos de descuento solo aplican si el sitio tiene activo **Recibir descuento extra desde endpoint de ventas**. Ver [Descuentos](/checkout/descuentos).

Cada pasarela restringe en qué monedas puede cobrar. Ver [Pasarelas de pago](/checkout/pasarelas-de-pago).

## Tarjeta

Los campos de tarjeta activan el cobro solo si llegan **los ocho** listados arriba. Además, el sitio debe tener configurado un **Método de Pago de Roplex**.

| Campo | Tipo | Descripción |
|---|---|---|
| `cardNumber` | string | Número de tarjeta. Se ignoran los espacios. Se aceptan Visa, Mastercard y American Express. Otro tipo devuelve HTTP 400 `Tipo de tarjeta no soportado`. |
| `cardExpirationDate` | string | Mes y año en cuatro dígitos. Se acepta `MMYY`, `MM/YY` o `MM-YY`; los dos primeros dígitos son el mes. |
| `cardCvv` | string | Código de seguridad. |
| `firstName` | string | Nombre del titular. Va a la dirección de facturación. |
| `lastName` | string | Apellido del titular. |
| `visaCuotas` | number | Número de cuotas: 3, 6, 10, 12, 18 o 24, según lo habilitado en el sitio. Un valor no numérico se trata como sin cuotas. |

Si pide cuotas y el total no alcanza el **Monto mínimo** configurado en el sitio, la pasarela rechaza el cobro.

> **Nota:** Roplex no registra el número de tarjeta, la fecha de vencimiento ni el CVV en claro en ningún lado.

## Transferencia

Se detecta con `transName`, `transBank` y `transDate`. Para completar el cobro también exige los dos últimos.

| Campo | Tipo | Descripción |
|---|---|---|
| `transName` | string | Nombre de quien transfiere. |
| `transBank` | string | Banco emisor. |
| `transDate` | string | Fecha. Si llega como `DD/MM/YYYY`, se convierte a `YYYY-MM-DD`. |
| `transNumber` | string | Número de comprobante. Obligatorio al procesar. |
| `transFile` | file | Comprobante. Obligatorio, y obliga a usar `multipart/form-data`. Puede repetirse. |

La orden con transferencia queda pagada de inmediato. Ver [Pasarelas de pago](/checkout/pasarelas-de-pago).

## Gift cards

| Campo | Tipo | Descripción |
|---|---|---|
| `gift_card_1_id_number` | string | Código de la primera tarjeta. |
| `gift_card_2_id_number` | string | Código de la segunda. No se puede enviar sola y debe ser distinta de la primera. |
| `gift_card_1_discount` | number \| string | Tope opcional a aplicar de la primera, en la moneda de la orden. Debe ser mayor o igual a 0. |
| `gift_card_2_discount` | number \| string | Tope opcional de la segunda. |

Si omite los topes, se aplica el máximo posible. Ver
[Usar GiftCards en el checkout](/gift-cards/usar-en-checkout) y
[Consultar saldo y cotizar](/gift-cards/consultar-saldo).

## Ejemplo: pago con tarjeta

```bash
curl -X POST "https://<host-roplex>/api/orders/create-ecommerce-order" \
  -H "Authorization: users API-Key <clave>" \
  -H "Origin: https://tienda.ejemplo.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente Ejemplo",
    "email": "cliente@ejemplo.com",
    "phone": "5555-0010",
    "tin": "CF",
    "item": "42",
    "quantity": "1",
    "item1": "b7",
    "quantity1": "2",
    "currency_id": "1",
    "address_line_1": "12 calle 3-20 zona 10",
    "city": "Guatemala",
    "state": "123",
    "delivery_instructions": "Portón azul",
    "firstName": "Ana",
    "lastName": "Pérez",
    "cardNumber": "4111111111111111",
    "cardExpirationDate": "12/28",
    "cardCvv": "123"
  }'
```

El cobro con tarjeta no termina en esta respuesta: continúa con la autenticación 3-D Secure. Ver [Autenticación 3-D Secure](/checkout/autenticacion-3d-secure).

## Ejemplo: transferencia bancaria

```bash
curl -X POST "https://<host-roplex>/api/orders/create-ecommerce-order" \
  -H "Authorization: users API-Key <clave>" \
  -H "Origin: https://tienda.ejemplo.com" \
  -F "name=Cliente Ejemplo" \
  -F "email=cliente@ejemplo.com" \
  -F "phone=55550010" \
  -F "item=42" \
  -F "quantity=1" \
  -F "currency_id=1" \
  -F "address_line_1=12 calle 3-20 zona 10" \
  -F "city=Guatemala" \
  -F "state=123" \
  -F "transName=Ana Pérez" \
  -F "transBank=Banco Ejemplo" \
  -F "transDate=28/08/2026" \
  -F "transNumber=ABC-001" \
  -F "transFile=@comprobante.pdf"
```

## Troubleshooting

**HTTP 400 `No body`**
La petición llegó sin cuerpo, o con `Content-Type: application/json` pero sin JSON válido.

**HTTP 400 pidiendo un solo medio de pago**
Llegaron los ocho campos de tarjeta y también los de transferencia. Envíe uno solo.

**La orden quedó pendiente cuando esperaba cobrarla con tarjeta**
Falta alguno de los ocho campos de tarjeta. Con siete no se activa el cobro y la orden se crea sin pago.

**Se envió `transFile` pero se rechaza la transferencia**
Debe usar `multipart/form-data`. En JSON no se puede adjuntar el comprobante.
