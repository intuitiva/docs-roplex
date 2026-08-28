---
title: Campos del endpoint
sidebar_label: Campos del endpoint
sidebar_position: 4
---

`POST /api/orders/create-ecommerce-order` no tiene un schema TypeScript. El body es un objeto plano. Todas las claves string se recortan (`trim`) antes de validar.

## Content-Type

- **application/json**: body JSON. Sirve para ítems, GiftCard y tarjeta. No sirve para adjuntar el comprobante de transferencia.
- **multipart/form-data**: obligatorio si hay `transFile`. Cada campo (salvo el archivo) se copia a la misma clave plana. `transFile` puede repetirse; se junta en un arreglo de `File`.

Sin body JSON (y sin form-data): HTTP 400 `{ "message": "No body" }`. Sin `FormData` en una petición multipart: HTTP 400 `{ "message": "FormData not available" }`.

No existe un campo `payment_method` en el body. El cobro se **infiere**:

- **Tarjeta** si están los ocho: `cardNumber`, `cardExpirationDate`, `cardCvv`, `firstName`, `lastName`, `address_line_1`, `state`, `city`.
- **Transferencia** si están `transName`, `transBank` y `transDate`. Luego exige también `transNumber` y `transFile`.
- Si GiftCard cubre el total, no se cobra el restante.
- Si el restante es mayor a 0 y hay tarjeta **y** transferencia, HTTP 400: solo uno de los dos para el restante.
- Si no hay tarjeta ni transferencia, la orden se crea en `pending` (salvo GiftCard que cubra todo → `paid`).

## Cliente

- **name**: nombre que se guarda en `ecommerce_clients`. Si el email ya existe en la entidad, se actualiza.
- **email**: clave de búsqueda (minúsculas). Crea o actualiza el cliente de esa entidad. Si la creación falla, HTTP 400: `Error en los datos del cliente, vuelva a intentarlo`.
- **phone**: se le quitan los no dígitos (`replace(/\D/g, "")`) y se guarda en el cliente y en la orden.
- **tin**: NIT. Si falta, se usa `"CF"`.

## Líneas

Las líneas no van en un arreglo. Van emparejadas por sufijo: la clave de cantidad se obtiene reemplazando el prefijo `quantity` por `item`.

- **item**, **item1**, **item2**, …: id numérico de `items`, o `"b"` + id de `bundles` (ejemplo: `b12`). Cualquier otra clave que empiece por `item` entra en el mismo juego. Si el valor no es número ni bundle `b{id}`, HTTP 400.
- **quantity**, **quantity1**, **quantity2**, …: cantidad de la línea cuyo `item*` tiene el mismo sufijo. El precio unitario **no** se envía; sale de `suggested_prices`.

Hace falta al menos una clave `item*`. Ver [Ítems, precios y stock](/checkout/items-precios-y-stock).

## Dirección y envío

- **address_line_1**: dirección de entrega (`orders.delivery_address`) y dirección de facturación de la tarjeta (`AddressOne`). Obligatorio para activar el camino de tarjeta.
- **delivery_instructions**: se guarda en la orden y viaja a Zauru/webhooks.
- **store_pickup**: si es `true`, `"true"` o `"1"`, no se calcula envío y se añade `"Recolección en tienda"` al memo. Cualquier otro valor (incluido ausente) calcula envío.
- **city**: municipio. Para tarjeta es obligatorio. En envío: si es numérico se usa como id de `cities`; si es texto se busca por nombre (filtrado por `state` si ya se resolvió).
- **state**: id de `states`. Obligatorio y numérico para tarjeta. En envío se carga el estado (país vía `state.country.code`, código postal del estado para bill-to).
- **postal_code**: entra al contexto de reglas de envío. En tarjeta, el bill-to usa el `postal_code` del **estado**, no este campo.
- **coupon**: código de cupón para reglas de envío con `condition_type: "coupon"`.

Ver [Envíos](/checkout/envios).

## Moneda, descuento y memo

- **currency_id**: id de `currencies`. Si no existe, HTTP 400. Si se omite, se usa la moneda de la entidad. Las pasarelas restringen qué moneda pueden cobrar; ver [Pasarelas de pago](/checkout/pasarelas-de-pago).
- **extra_discount_percent** / **extra_discount_amount**: mutuamente excluyentes. Solo aplican si el sitio tiene `accept_extra_discount_from_endpoint`. Ver [Descuentos](/checkout/descuentos).
- **memo**: texto libre. El handler concatena memos de conversión de moneda, recolección en tienda, tipo de cambio del pago y GiftCard.
- **reference**: referencia de la orden (`orders.reference`). Default `""`.

## Tarjeta

Se activan solo si están los ocho campos listados arriba. El sitio debe tener `payment_method` (`neo_pay`, `qpaypro` o `bac_powertranz`).

- **cardNumber**: número de tarjeta. Se le quitan espacios. Tipos aceptados: Visa (`001`), Mastercard (`002`), American Express (`003`). Otro BIN → HTTP 400 `Tipo de tarjeta no soportado`.
- **cardExpirationDate**: mes y año, 4 dígitos. Se acepta `MMYY`, `MM/YY` o `MM-YY` (los dos primeros dígitos son el mes). Cada pasarela reformatea internamente (NeoPay/BAC a `YYMM`; QPayPro también valida como mes-año de 4 dígitos).
- **cardCvv**: código de seguridad.
- **firstName** / **lastName**: titular. Van al bill-to de la pasarela.
- **visaCuotas**: número de cuotas (3, 6, 10, 12, 18 o 24 según lo habilitado en el sitio). Si no es número, se trata como 0 (sin cuotas). Si el total no llega al `minimum_amount` del bloque (por defecto 1000) y se piden cuotas, la pasarela rechaza.

Los datos de tarjeta se sustituyen por `************` en logs.

## Transferencia

Detección: `transName` + `transBank` + `transDate`. Para completar el cobro, también:

- **transName**: nombre de quien transfiere.
- **transBank**: banco.
- **transDate**: fecha. Si viene `DD/MM/YYYY`, se convierte a `YYYY-MM-DD`.
- **transNumber**: número de comprobante. Obligatorio al procesar.
- **transFile**: archivo o lista de archivos (multipart). Se sube a `media` y se asocia al `bank_transfer_request`. Obligatorio.

La orden con transferencia queda en estado `paid` (el código no la deja en `pending`). Ver [Pasarelas de pago](/checkout/pasarelas-de-pago) y [Respuestas y errores](/checkout/respuestas-y-errores).

## Gift cards

- **gift_card_1_id_number**: código (`id_number`) de la primera tarjeta.
- **gift_card_2_id_number**: segunda. No se puede enviar sola. Debe ser distinta de la primera.
- **gift_card_1_discount** / **gift_card_2_discount**: tope opcional en moneda de la orden. Si se omiten, se aplica el máximo: `min(saldo convertido, restante)`. Deben ser números ≥ 0.

Ver [Gift cards](/checkout/gift-cards).

## Ejemplo JSON (tarjeta)

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

Los ids de ítem, bundle y estado son los de Roplex (espejo de Zauru), no un SKU libre.

## Ejemplo multipart (transferencia)

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
