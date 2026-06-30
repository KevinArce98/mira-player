# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Reglas de código

- **No escribir comentarios en el código** (ni JSDoc, ni inline `//`, ni bloques `/* */`, ni JSX `{/* */}`).
  El código debe ser autoexplicativo mediante nombres claros. Los comentarios ensucian y afean el código.

---

# Mira Player — Guía del proyecto

App IPTV **Mira Player** (React Native / Expo SDK 56) que consume catálogos vía **Xtream Codes API**,
con catálogo, progreso y favoritos en **SQLite local**. MVP de **una sola cuenta**.

## Stack
- **Expo SDK 56** (prebuild + config plugins), React Native 0.85, React 19, TypeScript estricto.
- **Expo Router** (rutas en `src/app/`, alias `@/*` → `src/*`).
- **TanStack Query** (async/cache) + **Zustand** (estado UI).
- **expo-sqlite** (API async) para datos locales.
- **expo-secure-store** para el password Xtream (NO se guarda en SQLite).
- **react-native-video** para HLS (requiere dev build, **no funciona en Expo Go**).

## Arquitectura de datos
```
src/
  types/        models.ts (dominio = esquema SQLite) · xtream.ts (respuestas API)
  db/
    schema.ts   Migraciones versionadas (PRAGMA user_version). Para evolucionar: AÑADIR al final.
    index.ts    getDatabase() singleton con migraciones.
    repositories/  accounts · content · episodes · progress · favorites
  services/
    xtream/client.ts        Cliente API (URLs, fetch, EPG normalizado)
    xtream/from-account.ts  Construye cliente desde cuenta + SecureStore
    credentials.ts          Password en SecureStore
    sync.ts                 Sincronización de catálogo (live/movies/series)
    series.ts               Carga de episodios bajo demanda
    playback.ts             Resuelve URL de stream
  hooks/data/   Hooks React Query que la UI consume (use-account, use-sync, use-catalog,
                use-favorites, use-continue-watching, use-episodes, use-epg, use-progress-tracker)
  lib/          id.ts (uuid) · query-client.ts (QueryClient + queryKeys)
```

## Convenciones
- Tablas/campos en español, según el documento de arquitectura (`cuentas`, `contenido`,
  `episodios`, `progreso`, `favoritos`).
- Todo ID es UUID (expo-crypto). Timestamps en epoch-ms.
- El password NUNCA se persiste en SQLite ni se loguea.
- Progreso: throttle de escritura ~12 s (`use-progress-tracker`), completado al 95%.
- EPG: `get_short_epg` perezoso por canal visible, TTL 20 min.

## Sistema de diseño
- **Paleta de marca** (2 colores) en `src/constants/theme.ts`: Shadow Grey `#272727`, Sandy Clay `#D4AA7D`.
  Tema claro y oscuro derivados; el acento (`tint`) es siempre Sandy Clay y el texto sobre clay es `onTint` (Shadow Grey).
- **Tipografías**: Montserrat (display: títulos/headers) + Inter (cuerpo/listas), vía `@expo-google-fonts/*`
  cargadas en `src/app/_layout.tsx` con `useFonts`. Usar SIEMPRE `Fonts.*` (familias nombradas), nunca `fontWeight`
  (los pesos custom no se sintetizan en Android).
- **Sin librería de componentes ni Tailwind**: se usa el sistema de tokens propio (`Colors`/`Spacing`/`Fonts` +
  `ThemedText`/`ThemedView`). Minimalista a propósito.

## Decisiones del MVP (cerradas con el usuario)
1. **Una sola cuenta** Xtream (esquema ya lleva `cuenta_id` para multi-cuenta futuro).
2. Actualización de catálogo **manual + automática** (auto si >6 h, ver `use-sync`).
3. Credenciales en **SecureStore** (mejora sobre el doc original que las ponía en texto plano).

## Pendiente (próxima fase)
- UI: setup de cuenta, tabs (Live/Movies/Series/Search/Continuar), detalle, reproductor.
- Selector de subtítulos (solo pistas embebidas, ocultar si no hay).
- Pantalla de progreso de sincronización.
