# Mira Player — Web

Aplicación web progresiva (PWA) para consumir catálogos IPTV mediante el protocolo **Xtream Codes**. Sin backend propio: toda la lógica corre en el browser con SQLite (sql.js) persistido en IndexedDB.

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Routing | React Router v7 |
| Estado servidor | TanStack Query v5 |
| Base de datos | sql.js (SQLite en WASM) → IndexedDB |
| Streaming | hls.js |
| Build | Vite 6 |

## Requisitos

- Node.js ≥ 18
- pnpm (recomendado) — o npm / yarn

## Inicio rápido

```bash
pnpm install      # copia sql-wasm.wasm a /public automáticamente
pnpm dev          # http://localhost:5173
```

```bash
pnpm build        # tsc + vite build → /dist
pnpm preview      # sirve /dist localmente
```

## Estructura

```
src/
├── pages/          # Rutas: home, catalog, live, content-detail, player, search, settings, setup
├── components/
│   ├── media/      # ContentGrid, PosterCard, ChannelRow, …
│   ├── ui/         # CatalogToolbar, CategoryCombobox, SortPicker, …
│   └── layout/     # Sidebar, AppShell
├── hooks/data/     # useCatalog, useContent, useEpisodes, useFavorites, …
├── db/
│   ├── index.ts    # WebDatabase (wrapper sql.js ↔ IndexedDB)
│   ├── schema.ts   # Migraciones SQLite
│   └── repositories/
├── services/
│   ├── xtream/     # XtreamClient, normalizeServer
│   ├── sync.ts     # Sincronización catálogo desde el servidor
│   ├── credentials.ts  # Contraseña en sessionStorage
│   └── playback.ts
├── types/          # models.ts, xtream.ts
└── lib/
    ├── query-client.ts  # QueryClient + queryKeys
    └── i18n.ts          # Traducciones ES/EN
```

## Funcionalidades

- **Catálogo** — Películas, Series y TV en vivo con búsqueda, filtro por categoría y ordenamiento (A-Z, Z-A, año, reciente)
- **Infinite scroll** — Carga paginada con IntersectionObserver (40 ítems por página)
- **Detalle de contenido** — Metadatos, tráiler de YouTube (iframe sandboxed), progreso de reproducción
- **Player** — HLS nativo o html5, salto ±10 s, cambio de audio/subtítulos, modo fullscreen, guardado automático de progreso
- **Favoritos y progreso** — Persistidos localmente en SQLite
- **PWA** — Instalable, funciona offline para el catálogo ya sincronizado
- **Multiidioma** — Español / Inglés

## Seguridad

- Content Security Policy vía `<meta http-equiv>` — restringe scripts, frames (solo YouTube) y workers
- Contraseña en `sessionStorage` (se borra al cerrar la pestaña)
- `sandbox` en el iframe del tráiler
- `referrerpolicy="no-referrer"` en el player y peticiones HLS
- Validación de esquema en URLs de servidor y poster antes de persistir

## Notas de arquitectura

- **sql.js** se carga como dynamic import al primer acceso a la DB para no bloquear el bundle inicial.
- `staleTime: Infinity` en QueryClient — los datos SQLite solo se refrescan por invalidación explícita tras escrituras, no por tiempo.
- El catálogo se sincroniza manualmente desde Ajustes; el servidor Xtream se configura una sola vez en el flujo de onboarding.
