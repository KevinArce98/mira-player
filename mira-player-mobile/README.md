# Mira Player — Mobile (iOS / Android)

App IPTV (React Native / Expo SDK 56) que reproduce catálogos vía **Xtream Codes API**, con catálogo, progreso y favoritos en **SQLite local**. MVP de una sola cuenta.

## Stack

- Expo SDK 56 (prebuild + config plugins), React Native 0.85, React 19, TypeScript estricto
- Expo Router (rutas en `src/app/`, alias `@/*` → `src/*`)
- TanStack Query (async/cache) + Zustand (estado UI)
- expo-sqlite (datos locales) + expo-secure-store (password Xtream)
- react-native-video para HLS/VOD (requiere dev build, **no funciona en Expo Go**)

## Empezar

```bash
pnpm install
```

El reproductor usa módulos nativos, así que se necesita un **development build** (no Expo Go):

```bash
npx expo run:ios
npx expo run:android
```

Para builds de tienda con EAS, ver `eas.json`:

```bash
eas login
eas init
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Estructura

```
src/
  app/          Rutas (tabs, content/[id], player, setup, settings)
  components/   media/ y ui/ + ThemedText/ThemedView (sistema de tokens propio)
  constants/    theme.ts (paleta de marca, Spacing, Fonts)
  db/           schema.ts (migraciones versionadas) + repositories/
  services/     xtream/ (cliente API), sync, series, playback
  hooks/data/   hooks de React Query que consume la UI
  lib/          id, query-client, navigation, language
  types/        models.ts (dominio = SQLite) · xtream.ts (API)
```

## Marca

- Paleta: Shadow Grey `#272727` + Sandy Clay `#D4AA7D`
- Tipografías: Montserrat (display) + Inter (cuerpo)
- Icono: monograma **M**

## Calidad

```bash
npx tsc --noEmit
npx expo lint
```
