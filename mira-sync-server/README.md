# mira-sync-server

Backend de sincronización multi-dispositivo para Mira Player (Hono + Prisma + Postgres).
Sincroniza **progreso**, **favoritos** y **perfiles** entre dispositivos que usan las mismas
credenciales Xtream, sin login propio.

## Cómo funciona

- **Identidad sin password**: `account_lookup = sha256(servidor + "|" + usuario)`. El password se
  valida contra el `player_api` de Xtream en `/account/resolve` pero **nunca se persiste**.
- Cada dispositivo obtiene un `accountSecret` aleatorio (bearer) tras `resolve`; se guarda en el
  cliente (SecureStore en mobile, localStorage en web).
- **Perfiles** con `id` provisto por el cliente (UUID) — creados offline, reconciliados en el push.
- **Merge server-authoritative por campo**: `posicion = MAX`, `completado = OR`, `duración = LWW`.
  Favoritos borrados se propagan como tombstones (`deletedAt`). Resistente a relojes de cliente.
- **Delta sync**: `GET /sync/pull?since=<ms>` devuelve filas con `updatedAt > since`.

## Endpoints

- `POST /account/resolve` — `{servidor, usuario, password, deviceId, platform}` → `{accountId, deviceId, accountSecret, profiles[]}`
- `GET/POST/DELETE /profiles` — CRUD de perfiles (Bearer)
- `POST /sync/push` — `{profileId, progress[], favorites[]}` (Bearer)
- `GET /sync/pull?profileId&since` — delta (Bearer)

## Desarrollo local

Requiere **pnpm** (`corepack enable` si no lo tienes activo).

```bash
cp .env.example .env
docker compose up -d db
pnpm install
npx prisma migrate dev
pnpm dev                # http://localhost:8787
pnpm test               # tests del reducer de merge
```

Nota: usa **Prisma 7** con el driver adapter `@prisma/adapter-pg` (Prisma 7 ya no acepta `url` en el
datasource del schema; la URL de conexión vive en `prisma.config.ts` para el CLI/migraciones, y se
pasa explícitamente al adapter en `src/db.ts` para el runtime).

Para pruebas sin servidor Xtream real: `XTREAM_VALIDATE=false`.

## Deploy en Dokploy (Raspberry Pi)

1. Servicio Postgres con volumen persistente.
2. Servicio del API desde este `Dockerfile` (Debian slim; `binaryTargets` de Prisma ya incluye
   `linux-arm64-openssl-3.0.x`).
3. Variables: `DATABASE_URL`, `PORT`, `XTREAM_VALIDATE=true`.
4. El contenedor corre `prisma migrate deploy` al arrancar.
5. **Backups**: respaldar el volumen de Postgres periódicamente.

## Configuración en los clientes

El sync está **desactivado por defecto** (no rompe apps existentes). Para activarlo, apuntar cada
cliente a la URL pública del servidor:

- **Mobile** (Expo): `EXPO_PUBLIC_SYNC_BASE_URL=https://mi-pi.example.com` o
  `expoConfig.extra.syncBaseUrl`.
- **Web** (Vite): `VITE_SYNC_BASE_URL=https://mi-pi.example.com`.
