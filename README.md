# Mira Player

**Tu IPTV personal.** Reproductor multiplataforma de catálogos IPTV mediante el protocolo **Xtream Codes**. Sin backend propio: cada cliente habla directo con el servidor Xtream y guarda catálogo, progreso y favoritos en una base de datos local.

Este repositorio es un monorepo con un cliente nativo por plataforma. Todos comparten el mismo modelo de dominio (catálogo, progreso, favoritos sobre Xtream Codes) y la misma identidad de marca.

## Clientes

| Carpeta | Plataforma | Stack | Reproductor |
|---|---|---|---|
| [`mira-player-web`](mira-player-web/) | Navegador (PWA) | React 19 + TS · Vite · sql.js (SQLite/WASM) → IndexedDB | hls.js |
| [`mira-player-mobile`](mira-player-mobile/) | iOS / Android | React Native · Expo SDK 56 · expo-sqlite | react-native-video |
| [`mira-player-tizen`](mira-player-tizen/) | Samsung TV (Tizen) | TypeScript + Vite (sin framework) · navegación por D-pad | AVPlay |
| [`mira-player-roku`](mira-player-roku/) | Roku | BrightScript + SceneGraph | Video node |

## Identidad de marca

- **Nombre:** Mira Player
- **Tagline:** Tu IPTV personal
- **Paleta:** Shadow Grey `#272727` + Sandy Clay `#D4AA7D`
- **Tipografías:** Montserrat (display) + Inter (cuerpo)
- **Icono:** monograma **M**

## Concepto compartido

- **Protocolo:** Xtream Codes API (live, VOD/películas, series).
- **Sin servidor propio:** cada cliente consume el servidor Xtream directamente; las credenciales se configuran una vez en el onboarding.
- **Datos locales:** catálogo, progreso de reproducción y favoritos persistidos en el dispositivo (SQLite o equivalente por plataforma).
- **Funciones base:** catálogo con búsqueda/categorías/orden, detalle de contenido, *Continuar viendo*, favoritos, EPG en vivo y reproducción con guardado automático de progreso.
- **Seguridad:** la contraseña Xtream nunca se persiste en texto plano junto al catálogo (almacenamiento seguro / efímero por plataforma) ni se loguea.

## Empezar

Cada cliente se construye y ejecuta de forma independiente. Ver el README de cada carpeta:

- Web → [`mira-player-web/README.md`](mira-player-web/README.md)
- Móvil → [`mira-player-mobile/README.md`](mira-player-mobile/README.md)
- Tizen → [`mira-player-tizen/README.md`](mira-player-tizen/README.md)
- Roku → [`mira-player-roku/README.md`](mira-player-roku/README.md)

## Estado

MVP de **una sola cuenta** Xtream por cliente. El esquema de datos ya contempla `cuenta_id` para soporte multi-cuenta futuro.
