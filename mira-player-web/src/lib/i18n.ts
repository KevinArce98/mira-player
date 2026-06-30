export type Language = 'es' | 'en';

type Vars = Record<string, string | number>;

const es = {
  'tabs.home': 'Inicio',
  'tabs.live': 'TV',
  'tabs.movies': 'Películas',
  'tabs.series': 'Series',
  'tabs.search': 'Buscar',

  'home.title': 'Inicio',
  'home.continueWatching': 'Continuar viendo',
  'home.favorites': 'Favoritos',
  'home.syncing': 'Actualizando catálogo · {stage}',
  'home.empty.title': 'Aún no hay nada aquí',
  'home.empty.subtitle': 'Explora el catálogo y empieza a ver contenido para que aparezca en Continuar viendo.',

  'sync.live': 'Canales en vivo',
  'sync.movies': 'Películas',
  'sync.series': 'Series',
  'sync.done': 'Finalizando',

  'live.title': 'TV en vivo',
  'live.all': 'Todos',
  'live.search': 'Buscar canal…',
  'live.empty.title': 'Sin canales',
  'live.empty.subtitle': 'Sincroniza el catálogo desde Inicio.',

  'catalog.all': 'Todas',
  'catalog.search': 'Buscar…',
  'catalog.category': 'Categoría',
  'catalog.empty.title': 'Catálogo vacío',
  'catalog.empty.subtitle': 'Desliza hacia abajo en Inicio para sincronizar, o revisa tu cuenta.',
  'catalog.count': '{count} resultados',
  'catalog.sortTitle': 'Ordenar por',
  'catalog.sort.nombre_asc': 'A → Z',
  'catalog.sort.nombre_desc': 'Z → A',
  'catalog.sort.anio_desc': 'Más reciente',
  'catalog.sort.anio_asc': 'Más antiguo',
  'catalog.sort.reciente': 'Añadido recientemente',

  'movies.title': 'Películas',
  'series.title': 'Series',

  'search.title': 'Buscar',
  'search.placeholder': 'Canales, películas, series…',
  'search.prompt.title': 'Busca en todo tu catálogo',
  'search.prompt.subtitle': 'Escribe al menos 2 caracteres.',
  'search.noResults.title': 'Sin resultados',
  'search.noResults.subtitle': 'No se encontró "{query}".',

  'category.title': 'Categorías',
  'category.search': 'Buscar categoría',

  'channel.noGuide': 'Sin guía disponible',
  'channel.next': 'Después: {title}',

  'error.loadFailed.title': 'No se pudo cargar',
  'error.loadFailed.subtitle': 'Revisa tu conexión e inténtalo de nuevo.',

  'setup.connect': 'Conecta tu cuenta',
  'setup.subtitle': 'Introduce los datos de tu proveedor Xtream Codes.',
  'setup.server': 'Servidor',
  'setup.user': 'Usuario',
  'setup.password': 'Contraseña',
  'setup.submit': 'Conectar',
  'setup.note': 'Tu contraseña se guarda solo en esta sesión del navegador.',
  'setup.connectError': 'No se pudo conectar.',
  'setup.showPassword': 'Mostrar contraseña',
  'setup.hidePassword': 'Ocultar contraseña',

  'detail.trailer': 'Tráiler',
  'detail.resume': 'Reanudar',
  'detail.play': 'Reproducir',
  'detail.progress': 'Vas por {current} de {total}',
  'detail.cast': 'Reparto',
  'detail.season': 'Temporada {number}',
  'detail.noEpisodes': 'No se encontraron episodios.',
  'detail.episode': 'Episodio {number}',

  'player.audio': 'Audio',
  'player.subtitles': 'Subtítulos',
  'player.off': 'Desactivados',
  'player.track': 'Pista {number}',
  'player.live': 'EN VIVO',
  'player.error': 'Error de reproducción',
  'player.fullscreen': 'Pantalla completa',
  'player.exitFullscreen': 'Salir de pantalla completa',

  'settings.title': 'Ajustes',
  'settings.server': 'Servidor',
  'settings.user': 'Usuario',
  'settings.status': 'Estado',
  'settings.expires': 'Expira',
  'settings.connections': 'Conexiones',
  'settings.trial': 'Cuenta de prueba',
  'settings.lastSync': 'Última sincronización',
  'settings.syncNow': 'Sincronizar catálogo ahora',
  'settings.syncing': 'Sincronizando… ({count})',
  'settings.logout': 'Cerrar sesión',
  'settings.logoutConfirm.title': 'Cerrar sesión',
  'settings.logoutConfirm.message': 'Se eliminará la cuenta y el catálogo descargado de este dispositivo.',
  'settings.appearance': 'Apariencia',
  'settings.language': 'Idioma',
  'settings.theme.system': 'Sistema',
  'settings.theme.light': 'Claro',
  'settings.theme.dark': 'Oscuro',
  'settings.never': 'Nunca',
  'settings.yes': 'Sí',
  'settings.active': 'Activa',
  'settings.loading': 'Cargando…',
  'settings.noExpiry': 'Sin vencimiento',
  'settings.expired': '{date} (vencida)',
  'settings.expiresToday': '{date} (hoy)',
  'settings.expiresInDays': '{date} (en {days} días)',
  'settings.expiresInDay': '{date} (en {days} día)',

  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.dash': '—',
  'language.es': 'Español',
  'language.en': 'Inglés',
} as const;

type Dictionary = Record<keyof typeof es, string>;

const en: Dictionary = {
  'tabs.home': 'Home',
  'tabs.live': 'TV',
  'tabs.movies': 'Movies',
  'tabs.series': 'Series',
  'tabs.search': 'Search',

  'home.title': 'Home',
  'home.continueWatching': 'Continue watching',
  'home.favorites': 'Favorites',
  'home.syncing': 'Updating catalog · {stage}',
  'home.empty.title': 'Nothing here yet',
  'home.empty.subtitle': 'Browse the catalog and start watching so it shows up in Continue watching.',

  'sync.live': 'Live channels',
  'sync.movies': 'Movies',
  'sync.series': 'Series',
  'sync.done': 'Finishing',

  'live.title': 'Live TV',
  'live.all': 'All',
  'live.search': 'Search channel…',
  'live.empty.title': 'No channels',
  'live.empty.subtitle': 'Sync the catalog from Home.',

  'catalog.all': 'All',
  'catalog.search': 'Search…',
  'catalog.category': 'Category',
  'catalog.empty.title': 'Empty catalog',
  'catalog.empty.subtitle': 'Pull to refresh on Home to sync, or check your account.',
  'catalog.count': '{count} results',
  'catalog.sortTitle': 'Sort by',
  'catalog.sort.nombre_asc': 'A → Z',
  'catalog.sort.nombre_desc': 'Z → A',
  'catalog.sort.anio_desc': 'Newest first',
  'catalog.sort.anio_asc': 'Oldest first',
  'catalog.sort.reciente': 'Recently added',

  'movies.title': 'Movies',
  'series.title': 'Series',

  'search.title': 'Search',
  'search.placeholder': 'Channels, movies, series…',
  'search.prompt.title': 'Search your whole catalog',
  'search.prompt.subtitle': 'Type at least 2 characters.',
  'search.noResults.title': 'No results',
  'search.noResults.subtitle': 'Nothing found for "{query}".',

  'category.title': 'Categories',
  'category.search': 'Search category',

  'channel.noGuide': 'No guide available',
  'channel.next': 'Next: {title}',

  'error.loadFailed.title': 'Could not load',
  'error.loadFailed.subtitle': 'Check your connection and try again.',

  'setup.connect': 'Connect your account',
  'setup.subtitle': 'Enter your Xtream Codes provider details.',
  'setup.server': 'Server',
  'setup.user': 'Username',
  'setup.password': 'Password',
  'setup.submit': 'Connect',
  'setup.note': 'Your password is stored for this browser session only.',
  'setup.connectError': 'Could not connect.',
  'setup.showPassword': 'Show password',
  'setup.hidePassword': 'Hide password',

  'detail.trailer': 'Trailer',
  'detail.resume': 'Resume',
  'detail.play': 'Play',
  'detail.progress': '{current} of {total}',
  'detail.cast': 'Cast',
  'detail.season': 'Season {number}',
  'detail.noEpisodes': 'No episodes found.',
  'detail.episode': 'Episode {number}',

  'player.audio': 'Audio',
  'player.subtitles': 'Subtitles',
  'player.off': 'Off',
  'player.track': 'Track {number}',
  'player.live': 'LIVE',
  'player.error': 'Playback error',
  'player.fullscreen': 'Fullscreen',
  'player.exitFullscreen': 'Exit fullscreen',

  'settings.title': 'Settings',
  'settings.server': 'Server',
  'settings.user': 'Username',
  'settings.status': 'Status',
  'settings.expires': 'Expires',
  'settings.connections': 'Connections',
  'settings.trial': 'Trial account',
  'settings.lastSync': 'Last sync',
  'settings.syncNow': 'Sync catalog now',
  'settings.syncing': 'Syncing… ({count})',
  'settings.logout': 'Log out',
  'settings.logoutConfirm.title': 'Log out',
  'settings.logoutConfirm.message': 'The account and downloaded catalog will be removed from this device.',
  'settings.appearance': 'Appearance',
  'settings.language': 'Language',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.never': 'Never',
  'settings.yes': 'Yes',
  'settings.active': 'Active',
  'settings.loading': 'Loading…',
  'settings.noExpiry': 'No expiry',
  'settings.expired': '{date} (expired)',
  'settings.expiresToday': '{date} (today)',
  'settings.expiresInDays': '{date} (in {days} days)',
  'settings.expiresInDay': '{date} (in {days} day)',

  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.dash': '—',
  'language.es': 'Spanish',
  'language.en': 'English',
};

export type TranslationKey = keyof typeof es;

const dictionaries: Record<Language, Dictionary> = { es, en };

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function translate(language: Language, key: TranslationKey, vars?: Vars): string {
  const dict = dictionaries[language] ?? dictionaries.es;
  return interpolate(dict[key] ?? es[key] ?? key, vars);
}

export function localeFor(language: Language): string {
  return language === 'en' ? 'en-US' : 'es';
}
