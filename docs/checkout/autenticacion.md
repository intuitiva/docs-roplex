---
title: Autenticación
sidebar_label: Autenticación
sidebar_position: 2
---

Roplex no autentica compradores. El comprador nunca inicia sesión en Roplex: es la tienda la que llama a la API con una clave propia, y esa clave determina de qué entidad y de qué sitio es la orden.

## Clave de API

Todas las llamadas del checkout requieren este header:

```text
Authorization: users API-Key <clave>
```

La clave se genera desde el admin de Roplex, sobre el usuario que representa a la tienda. Pídasela al administrador de su instancia; no se puede generar desde la API.

Sin una clave válida, la respuesta es HTTP 401:

```json
{ "success": false, "message": "User not found" }
```

## Entidad seleccionada

El usuario de la clave debe tener una **entidad seleccionada** en Roplex. La entidad es la compañía dueña de la tienda, y su id coincide con el id de la compañía en Zauru.

Si el usuario no tiene entidad, la respuesta es HTTP 400:

```json
{ "success": false, "message": "User does not have an entity selected" }
```

Todos los datos de negocio —ítems, precios, órdenes, sitios, gift cards— están aislados por entidad. Una clave de API solo ve y escribe datos de su propia entidad.

## Resolución del sitio

Una entidad puede tener varios [sitios](/checkout/configuracion-del-sitio). El checkout necesita saber cuál, porque de ahí salen la lista de precios, la pasarela de pago y las credenciales de Zauru.

Roplex identifica la tienda por el **host desde el que se hizo la petición**, no por el host de la API. Ese host se toma, en este orden:

1. Del header `Origin`, si es una URL válida.
2. Si no, del header `Referer`.

Después se compara, en minúsculas, contra los links registrados en **URLs de Sitios de Comercio** del ambiente actual.

El orden de resolución es:

1. Si el usuario de la clave tiene un sitio fijo asignado y ese sitio pertenece a su entidad, se usa ese.
2. Si la entidad no tiene sitios, no hay sitio.
3. Si tiene exactamente uno, se usa ese.
4. Si tiene varios y hay host, se usa el sitio cuyo link coincida con el host.
5. Si ninguno coincide, o no hay host, se usa el primer sitio de la entidad.

> **Advertencia:** el paso 5 es la causa más común de órdenes creadas contra el sitio equivocado. Envíe siempre `Origin` desde la tienda y registre el link de cada ambiente en el sitio correspondiente.

Sin sitio resuelto el checkout continúa, pero no encuentra lista de precios, pasarela ni credenciales de Zauru. En la práctica la orden falla al buscar el precio del primer ítem o al intentar cobrar.

## CORS

La API acepta peticiones desde cualquier origen y con cualquier header, así que la tienda puede llamar al checkout directamente desde el navegador.

Aun así, envíe el checkout desde su backend siempre que pueda: la clave de API da acceso a todos los datos de la entidad y no debe quedar expuesta en el navegador.

## Datos de referencia sin autenticar

Los catálogos geográficos —países, estados, ciudades y distritos— se pueden leer sin clave de API. Los necesita para armar los campos `state` y `city` del checkout:

```bash
curl "https://<host-roplex>/api/states?where[country][equals]=1&limit=100"
curl "https://<host-roplex>/api/cities?where[state][equals]=123&limit=200"
```

Las monedas sí requieren clave de API y entidad seleccionada. Ver [Campos del endpoint](/checkout/campos) para el uso de `currency_id`.

## Troubleshooting

**HTTP 401 `User not found`**
El header `Authorization` falta, tiene otro formato o la clave fue revocada. El formato exacto es `users API-Key <clave>`, con ese prefijo literal.

**HTTP 400 `User does not have an entity selected`**
El usuario de la clave no tiene entidad asignada en Roplex. Es una corrección en el admin, no en su código.

**La orden se creó pero con precios o pasarela de otro sitio**
No se resolvió el sitio por host. Confirme que la tienda envía `Origin` y que ese host está en **URLs de Sitios de Comercio** para el ambiente en el que está llamando.
