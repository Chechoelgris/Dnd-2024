# Backend — Hoja de Personaje D&D 2024

API REST para persistir personajes en la nube, con validación autoritativa de
reglas. Stack elegido: **Railway** (ejecuta la API) + **Supabase** (Postgres +
Auth) + **GitHub/Cloudflare Pages** (el frontend estático).

Es una implementación de referencia de la Parte 2 de
[`../docs/integration-prompt.md`](../docs/integration-prompt.md): local-first,
dos scopes (índice relacional + documento JSONB), control de versión optimista
y re-derivación de cifras en el servidor.

## Estructura

```
backend/
  src/
    server.js      Express: rutas, CORS, manejo de errores
    engine.js      Motor de reglas (deriva CA/salvaciones/CD; valida el payload)
    db.js          Postgres (Supabase) con fallback en memoria para dev
    auth.js        Verificación del JWT de Supabase (+ modo dev por header)
    rules-data.js  Catálogos de reglas servidos (objetos, conjuros, tablas)
    migrate.js     Aplica el esquema y siembra los catálogos
  db/schema.sql    Tablas + Row Level Security
  test/            Tests del motor (node --test)
  railway.json     Configuración de despliegue (healthcheck /health)
```

## Desarrollo local (sin base de datos)

```bash
cd backend
npm install
npm run dev          # arranca en :3000, almacén en memoria, auth DEV
```

En modo dev no hace falta token: manda tu identidad con el header
`X-Dev-User: <lo-que-sea>`. Ejemplo:

```bash
curl localhost:3000/health
curl -X POST localhost:3000/v1/characters -H 'X-Dev-User: yo' \
  -H 'Content-Type: application/json' \
  -d '{"sheet":{"identity":{"name":"Vex","classKey":"rogue","level":5}}}'
```

## Puesta en producción

### 1. Supabase (base de datos + auth)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región **South
   America (São Paulo)** para menor latencia desde Chile).
2. Aplica el esquema y siembra catálogos:
   ```bash
   DATABASE_URL="<Connection string · Pooler · puerto 6543>" npm run migrate
   ```
   (Supabase → Project Settings → Database → Connection string → "Connection
   pooling", modo *Transaction*.)
3. Copia dos valores de Project Settings → API:
   - **JWT Secret** → variable `SUPABASE_JWT_SECRET`
   - la **anon key** y la **Project URL** los usará el *frontend* para el login.

### 2. Railway (la API)

1. Nuevo proyecto → *Deploy from GitHub repo* → este repo, **root `/backend`**.
2. Variables de entorno (Railway → Variables), a partir de `.env.example`:
   - `DATABASE_URL` — la connection string del pooler de Supabase.
   - `SUPABASE_JWT_SECRET` — el JWT Secret.
   - `CORS_ORIGINS` — la URL de tu frontend (p. ej.
     `https://chechoelgris.github.io`).
   - `NODE_ENV=production` (desactiva el modo auth DEV).
   - `PORT` lo inyecta Railway solo.
3. Railway detecta Node (Nixpacks) y ejecuta `npm start`. El healthcheck de
   `railway.json` apunta a `/health`.

### 3. Frontend (Pages)

El frontend seguirá siendo estático, pero apuntando a la API cuando haya sesión.
Login con `@supabase/supabase-js` (anon key), y las llamadas a
`/v1/characters` con `Authorization: Bearer <access_token>`. La integración del
cliente es el siguiente paso; el contrato ya está fijado abajo.

## Contrato de la API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | — | Estado del servicio y del almacén |
| GET | `/v1/rules/items` | — | Catálogo de objetos/armas/armaduras |
| GET | `/v1/rules/spells?class=` | — | Catálogo de conjuros (filtro opcional por clase) |
| GET | `/v1/characters` | Bearer | Índice de personajes del usuario |
| POST | `/v1/characters` | Bearer | Crear (body `{ sheet }`) |
| GET | `/v1/characters/:id` | Bearer | Personaje + `derived` (cifras calculadas) |
| PATCH | `/v1/characters/:id` | Bearer | Merge parcial; manda `version` para detectar conflictos |
| DELETE | `/v1/characters/:id` | Bearer | Borrar |

**Garantías del servidor** (§2.7 de la spec):
- Los campos derivados (CA, salvaciones, CD de conjuro, percepción pasiva…) que
  lleguen en el payload se **descartan**; el servidor los recalcula y los
  devuelve en `derived`.
- Se validan rangos (características 1–30, nivel 1–20), claves de clase, y que la
  asignación de característica del trasfondo caiga dentro de las 3 permitidas.
  Un fallo devuelve `422` con `error.details[]`.
- `PATCH` con una `version` desactualizada devuelve `409` con el estado actual
  del servidor en `current`.

## Errores

Formato uniforme: `{ "error": { "code", "message", "field?", "details?" } }`.
Los mensajes son accionables (p. ej. *"El nivel debe ser un entero entre 1 y
20."*).
