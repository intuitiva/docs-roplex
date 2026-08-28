---
title: Autenticación
sidebar_label: Autenticación
sidebar_position: 2
---

El endpoint es un custom endpoint de Payload. No usa sesión de comprador: la tienda llama con un usuario Payload que tiene API key.

## API key

La colección `users` tiene `auth.useAPIKey: true`. El header que usan las pruebas y scripts de Roplex es:

```
Authorization: users API-Key <clave>
```

Sin `req.user` la respuesta es HTTP 401:

```json
{ "success": false, "message": "User not found" }
```

Ese usuario de storefront no necesita permiso de create sobre `orders` (eso es solo super admin). El handler escribe por Local API.

## Entidad seleccionada

El usuario debe tener `selected_entity` poblado **como objeto**, no como id numérico suelto. Si falta o llega como número, la respuesta es HTTP 400:

```json
{ "success": false, "message": "User does not have an entity selected" }
```

La entidad es la compañía Zauru (tienda). Los datos de negocio (ítems, órdenes, sitios) están aislados por `entity`. El id de entidad coincide con el id en Zauru.

El usuario también puede tener `selected_site`. Si ese sitio pertenece a la entidad, el checkout lo usa de inmediato.

## Resolución del sitio

Después de autenticar, el handler toma el host de la petición y llama a `getSiteForUser`. El host **no** sale de `Host` ni de `X-Forwarded-Host` (esos apuntan a la API de Roplex). Sale de:

1. Header `Origin`, si se puede parsear como URL.
2. Si no, header `Referer`.

El host se compara en minúsculas contra `sites.url_commerce[].link` del ambiente `APP_ENV` (`production`, `staging` o `development`).

Orden de resolución:

1. Si el usuario tiene `selected_site` y ese sitio pertenece a la entidad, se usa ese sitio.
2. Si la entidad tiene 0 sitios, no hay sitio.
3. Si tiene exactamente 1, se usa ese.
4. Si tiene más de 1 y hay host, se busca coincidencia con `url_commerce` del ambiente actual.
5. Si no hay coincidencia (o no hay host), se usa el primer sitio de la entidad.

Sin sitio, el checkout sigue, pero no hay lista de precios de agencia, pasarela, token de Zauru ni webhooks. En la práctica la orden falla al no encontrar precio sugerido o al intentar cobrar.

## CORS

El handler está envuelto en `withCors`. En `payload.config.ts` CORS está abierto: `origins: "*"` y `headers: ["*"]`.
