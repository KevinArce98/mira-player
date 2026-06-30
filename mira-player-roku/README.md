# Mira Player — Roku

Cliente IPTV Xtream Codes para dispositivos **Roku**. Escrito en **BrightScript + SceneGraph**, sin dependencias externas. Navegación por control remoto y reproducción con el nodo `Video` nativo.

- App SceneGraph pura: `roSGScreen` → `MainScene` enruta entre pantallas.
- Habla directo con el servidor Xtream desde un `Task` en segundo plano (`XtreamTask`).
- Catálogo, progreso y favoritos persistidos en el **registro de Roku** (`registry.brs`).

## Estructura

```
manifest                 título, versión, íconos y splash del canal
source/
  main.brs               punto de entrada (crea la escena y bombea eventos)
  registry.brs           lectura/escritura del registro Roku (datos locales)
  utils.brs              helpers compartidos
components/
  MainScene.{xml,brs}    router de pantallas + estado global
  tasks/
    XtreamTask.{xml,brs} llamadas a la API Xtream fuera del hilo de render
  screens/
    SetupScreen          onboarding: servidor + credenciales Xtream
    HomeScreen           rieles: Continuar viendo, Favoritos, vistas por tipo
    CatalogScreen        grilla por categoría (Películas / Series)
    LiveScreen           TV en vivo + EPG
    DetailScreen         detalle de serie/película (temporadas, episodios)
    PlayerScreen         reproductor (nodo Video) con guardado de progreso
    SettingsScreen       ajustes y sincronización de catálogo
images/                  íconos y splash del canal (ver images/README.txt)
```

## Funciones

- **Inicio**: rieles de *Continuar viendo*, *Favoritos* y vistas previas por tipo.
- **Catálogo** (En vivo / Películas / Series): categorías + grilla navegable por D-pad.
- **Detalle de serie**: temporadas, episodios y progreso por episodio.
- **Continuar viendo**: el progreso de VOD/series se guarda en el registro y se reanuda.
- **EPG en vivo**: programa actual y siguiente en el reproductor de canales.

## Desarrollo

Necesitas un dispositivo Roku en **modo desarrollador**.

### 1. Activar el modo desarrollador

En el Roku: pulsa en el control **Home ×3, Up ×2, Right, Left, Right, Left, Right**. Anota la **IP** y la contraseña que muestra la pantalla de developer.

### 2. Empaquetar e instalar (sideload)

El canal es un zip con `manifest` en la raíz + `source/`, `components/` e `images/`.

```bash
# desde la raíz de mira-player-roku
zip -r mira-player-roku.zip manifest source components images

# subir vía la web del Development Application Installer
# http://<IP-del-Roku> → Upload → selecciona el zip → Install
```

También puedes subirlo con `curl`:

```bash
curl -s -S -F "mysubmit=Install" -F "archive=@mira-player-roku.zip" \
  --user "rokudev:<password>" --digest \
  "http://<IP-del-Roku>/plugin_install"
```

### 3. Logs (debug)

```bash
telnet <IP-del-Roku> 8085   # consola de BrightScript (print / errores)
```

## Imágenes del canal

`images/` contiene placeholders. Para publicar en el Roku Channel Store reemplázalos por el arte real (ver [`images/README.txt`](images/README.txt) para tamaños). Para sideload/desarrollo no son obligatorios.

## Notas

- **Publicar** en el Channel Store requiere cuenta de desarrollador de Roku y revisión; el flujo de arriba es para *sideload* en tus propios equipos.
- La paleta de marca (Sandy Clay `#D4AA7D` sobre Shadow Grey) está en `manifest` (`splash_color`) y en los componentes.
