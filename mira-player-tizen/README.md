# Mira Player — Samsung Tizen (TV)

Cliente IPTV Xtream Codes para televisores Samsung. Reutiliza la lógica del
cliente web (`mira-player-web`) con UI pensada para control remoto: navegación
espacial por D-pad y reproductor nativo **AVPlay**.

- Sin framework de UI (TS + Vite) para que el `.wgt` sea liviano.
- `webapis.avplay` en la TV; fallback a `<video>` en navegador para desarrollo.
- La app corre desde `file://`, así que habla directo con el servidor Xtream
  (sin proxy, a diferencia del web en HTTPS).

## Estructura

```
src/
  core/        cliente Xtream, library (caché), session, store,
               favoritos, progreso, router, navegación espacial, teclas remoto
  player/      envoltorio AVPlay (+ fallback <video>)
  ui/          pantallas: setup, home (Inicio/En vivo/Películas/Series/Buscar),
               detail (serie), player; cards y acciones; estilos
  types/       tipos Xtream
config.xml     manifiesto Tizen (privilegios, perfil tv-samsung)
icon.png       icono de la app (placeholder — reemplázalo por el real 512×512)
```

## Funciones

- **Inicio**: rieles de *Continuar viendo*, *Favoritos* y vistas previas por tipo.
- **Catálogo** (En vivo / Películas / Series): barra de categorías + grilla.
- **Detalle de serie**: temporadas, episodios y barra de progreso por episodio.
- **Buscar**: filtra películas, series y canales (listados cacheados).
- **Favoritos**: tecla **amarilla** del remoto alterna favorito sobre la tarjeta enfocada.
- **Continuar viendo**: el progreso de VOD/series se guarda y reanuda.
- **EPG en vivo**: programa actual y siguiente en el reproductor de canales.

## Desarrollo (en el navegador)

```bash
npm install
npm run dev      # http://localhost:5180
```

Flechas = D-pad, Enter = OK, Esc = Atrás. El video usa `<video>` HTML5; algunos
streams (live `.ts`) no reproducen en navegador pero sí en la TV con AVPlay.

## Build web

```bash
npm run build    # genera dist/ (raíz www del widget)
```

### Paquete sin firmar (para inspección)

```bash
npm run package:unsigned   # genera MiraPlayer-unsigned.wgt
```

Un `.wgt` es un zip con `config.xml` en la raíz + el contenido web. Este comando
arma ese zip, pero **una TV real rechaza widgets sin firmar**: para instalar hay
que firmarlo con tu certificado Samsung (`tizen package -s <perfil>`, abajo). El
paquete sin firmar sirve para revisar el contenido, no para instalar.

## Empaquetar e instalar en la TV

Necesitas **Tizen Studio** (incluye el CLI `tizen` y el emulador/Device Manager).

### 1. Instalar Tizen Studio

1. Descarga Tizen Studio (with TV extensions) desde
   https://developer.tizen.org/development/tizen-studio/download
2. Instálalo. En macOS necesitas **JDK 17** y la variable `JAVA_HOME` apuntando a él.
3. Abre **Package Manager** → pestaña *Extension SDK* → instala **Samsung Certificate Extension** y **TV Extensions**.
4. Agrega el CLI al PATH (ajusta la ruta según tu instalación):

   ```bash
   export TIZEN_STUDIO="$HOME/tizen-studio"
   export PATH="$TIZEN_STUDIO/tools/ide/bin:$TIZEN_STUDIO/tools:$PATH"
   tizen version   # verifica
   ```

### 2. Crear el certificado de firma

Toda app Tizen debe ir firmada. Para cargarla en tu propia TV necesitas un
**Samsung certificate** (no el genérico Tizen):

1. Abre Tizen Studio → **Tools → Certificate Manager**.
2. *New → Samsung → Create a new certificate*. Crea un **Author certificate** y
   un **Distributor certificate**. Para el distributor inicia sesión con tu
   Samsung account y registra el **DUID** de tu TV (lo obtienes en el paso 4).
3. Esto crea un *security profile* (p.ej. `mira`). El `package.json` usa `-s mira`;
   cambia el nombre si tu perfil se llama distinto.

### 3. Poner la TV en modo desarrollador

1. En la TV: app **Apps** → escribe `12345` con el control → activa **Developer mode**.
2. Ingresa la **IP de tu PC** y reinicia la TV.
3. Anota la IP de la TV (Configuración → Red).

### 4. Conectar, empaquetar e instalar

```bash
# conecta el SDB a la TV (usa la IP de tu TV)
sdb connect 192.168.1.50
sdb devices                      # confirma que aparece

# obtén el DUID de la TV (para el distributor cert del paso 2)
tizen security-profiles list     # o Device Manager → DUID

# build + empaqueta el .wgt firmado
npm run build
tizen build-web -- dist
tizen package -t wgt -s mira -- dist/.buildResult

# instala en la TV
tizen install -n MiraPlayer.wgt -t <nombre-del-target> -- dist/.buildResult
```

`npm run package` encadena build + build-web + package. El target lo ves con
`sdb devices`.

### 5. Lanzar

```bash
tizen run -p http://mira-player.app/tizen -t <nombre-del-target>
```

o abre la app desde la grilla de apps de la TV.

## Notas

- **Certificado caduca / cambias de TV:** vuelve al Certificate Manager y agrega
  el nuevo DUID al distributor certificate.
- **`icon.png`** es un placeholder generado. Reemplázalo por el arte real (PNG,
  recomendado 512×512) antes de publicar.
- **Tienda Samsung:** publicar en Samsung Apps TV requiere certificado de
  distribución de Samsung y revisión del Seller Office; el flujo de arriba es
  para *sideload* en tus propios equipos.
- Para canales live se usa extensión `.ts` por defecto (más compatible con
  AVPlay). Si tu proveedor sirve HLS, cambia el `ext` en `liveStreamUrl`.
