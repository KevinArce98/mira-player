export type Language = 'es' | 'en';

type Vars = Record<string, string | number>;

const es = {
  'tabs.home': 'Inicio',
  'tabs.live': 'En vivo',
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

  'live.title': 'En vivo',
  'live.all': 'Todos',
  'live.empty.title': 'Sin canales',
  'live.empty.subtitle': 'Tu servidor de medios no tiene canales en vivo, o aún no has sincronizado.',

  'catalog.all': 'Todas',
  'catalog.empty.title': 'Catálogo vacío',
  'catalog.empty.subtitle': 'Desliza hacia abajo en Inicio para sincronizar, o revisa tu cuenta.',
  'catalog.count': '{count} resultados',
  'catalog.sortTitle': 'Ordenar por',
  'catalog.sort.defecto': 'Por defecto',
  'catalog.sort.nombre_asc': 'A → Z',
  'catalog.sort.nombre_desc': 'Z → A',
  'catalog.sort.anio_desc': 'Más reciente',
  'catalog.sort.anio_asc': 'Más antiguo',
  'catalog.sort.reciente': 'Añadido recientemente',

  'movies.title': 'Películas',
  'series.title': 'Series',

  'search.title': 'Buscar',
  'search.placeholder': 'Películas, series…',
  'search.prompt.title': 'Busca en todo tu catálogo',
  'search.prompt.subtitle': 'Escribe al menos 2 caracteres.',
  'search.noResults.title': 'Sin resultados',
  'search.noResults.subtitle': 'No se encontró "{query}".',

  'category.title': 'Categorías',
  'category.search': 'Buscar categoría',
  'category.reorder': 'Reordenar categorías',
  'category.reorderHint': 'Usa las flechas para mover cada categoría.',
  'category.done': 'Listo',

  'channel.noGuide': 'Sin guía disponible',
  'channel.next': 'Después: {title}',

  'error.loadFailed.title': 'No se pudo cargar',
  'error.loadFailed.subtitle': 'Revisa tu conexión e inténtalo de nuevo.',

  'setup.connect': 'Conecta tu servidor de medios',
  'setup.subtitle': 'Mira reproduce el catálogo de tu propio servidor de medios. No incluye ni distribuye contenido.',
  'setup.server': 'Servidor',
  'setup.user': 'Usuario',
  'setup.password': 'Contraseña',
  'setup.submit': 'Conectar',
  'setup.note': 'Tu contraseña se guarda cifrada en el dispositivo.',
  'setup.connectError': 'No se pudo conectar.',
  'setup.showPassword': 'Mostrar contraseña',
  'setup.hidePassword': 'Ocultar contraseña',
  'setup.legalCheckbox': 'He leído y acepto los ',
  'setup.legalTermsLink': 'Términos de Uso',
  'setup.or': 'o',
  'setup.demoButton': 'Explorar en modo demo',
  'setup.demoNote': '¿No tienes cuenta propia? Explora la interfaz con datos de ejemplo.',

  'settings.demoMode': 'Modo demo activo',
  'settings.demoDescription': 'Los datos son de ejemplo. Cierra sesión y conecta tu servidor para usar Mira.',
  'settings.legal': 'Términos de Uso',

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
  'player.nextEpisode': 'Siguiente episodio',
  'player.nextIn': 'Se reproducirá en {seconds} s',
  'player.nextWhenReady': 'Se reproducirá al terminar',
  'player.playNow': 'Reproducir ahora',

  'parental.title': 'Control parental',
  'parental.description': 'Oculta las categorías de contenido adulto y las categorías que elijas. Protegido con PIN.',
  'parental.blockedCategories': 'Categorías bloqueadas',
  'parental.blockedCategories.subtitle': 'El contenido de las categorías marcadas se oculta en toda la app. Las categorías de adultos se bloquean automáticamente.',
  'parental.pin.create': 'Crea un PIN de 4 dígitos',
  'parental.pin.confirm': 'Confirma el PIN',
  'parental.pin.enter': 'Introduce tu PIN',
  'parental.pin.mismatch': 'Los PIN no coinciden. Inténtalo de nuevo.',
  'parental.pin.wrong': 'PIN incorrecto.',
  'parental.pin.hint': 'PIN de 4 dígitos',

  'rating.title': '¿Disfrutas Mira Player?',
  'rating.message': 'Tu valoración nos ayuda a seguir mejorando la app.',
  'rating.rate': 'Calificar la app',
  'rating.later': 'Más tarde',
  'rating.never': 'No volver a preguntar',

  'continueWatching.removeTitle': 'Quitar de Continuar viendo',
  'continueWatching.removeMessage': '¿Quitar "{title}" de Continuar viendo?',

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

  'settings.profiles': 'Perfiles',
  'settings.profiles.subtitle': 'Cada perfil tiene su propio progreso y favoritos.',
  'settings.profiles.newProfile': 'Nuevo perfil',
  'settings.profiles.namePlaceholder': 'Nombre del perfil',
  'settings.profiles.create': 'Crear perfil',
  'settings.profiles.rename': 'Renombrar perfil',
  'settings.profiles.deleteTitle': 'Eliminar perfil',
  'settings.profiles.deleteMessage': 'Se eliminará "{nombre}" y su progreso y favoritos. Esta acción no se puede deshacer.',
  'settings.profiles.cannotDeleteActive': 'Cambia a otro perfil antes de eliminar el que está activo.',

  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.remove': 'Quitar',
  'common.save': 'Guardar',
  'common.dash': '—',
  'language.es': 'Español',
  'language.en': 'Inglés',
} as const;

type Dictionary = Record<keyof typeof es, string>;

const en: Dictionary = {
  'tabs.home': 'Home',
  'tabs.live': 'Live',
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

  'live.title': 'Live',
  'live.all': 'All',
  'live.empty.title': 'No channels',
  'live.empty.subtitle': 'Your media server has no live channels, or you haven\'t synced yet.',

  'catalog.all': 'All',
  'catalog.empty.title': 'Empty catalog',
  'catalog.empty.subtitle': 'Pull to refresh on Home to sync, or check your account.',
  'catalog.count': '{count} results',
  'catalog.sortTitle': 'Sort by',
  'catalog.sort.defecto': 'Default',
  'catalog.sort.nombre_asc': 'A → Z',
  'catalog.sort.nombre_desc': 'Z → A',
  'catalog.sort.anio_desc': 'Newest first',
  'catalog.sort.anio_asc': 'Oldest first',
  'catalog.sort.reciente': 'Recently added',

  'movies.title': 'Movies',
  'series.title': 'Series',

  'search.title': 'Search',
  'search.placeholder': 'Movies, series…',
  'search.prompt.title': 'Search your whole catalog',
  'search.prompt.subtitle': 'Type at least 2 characters.',
  'search.noResults.title': 'No results',
  'search.noResults.subtitle': 'Nothing found for "{query}".',

  'category.title': 'Categories',
  'category.search': 'Search category',
  'category.reorder': 'Reorder categories',
  'category.reorderHint': 'Use the arrows to move each category.',
  'category.done': 'Done',

  'channel.noGuide': 'No guide available',
  'channel.next': 'Next: {title}',

  'error.loadFailed.title': 'Could not load',
  'error.loadFailed.subtitle': 'Check your connection and try again.',

  'setup.connect': 'Connect your media server',
  'setup.subtitle': 'Mira plays the catalog of your own media server. It does not include or distribute any content.',
  'setup.server': 'Server',
  'setup.user': 'Username',
  'setup.password': 'Password',
  'setup.submit': 'Connect',
  'setup.note': 'Your password is stored encrypted on the device.',
  'setup.connectError': 'Could not connect.',
  'setup.showPassword': 'Show password',
  'setup.hidePassword': 'Hide password',
  'setup.legalCheckbox': 'I have read and accept the ',
  'setup.legalTermsLink': 'Terms of Use',
  'setup.or': 'or',
  'setup.demoButton': 'Explore in demo mode',
  'setup.demoNote': "Don't have your own account? Explore the interface with sample data.",

  'settings.demoMode': 'Demo mode active',
  'settings.demoDescription': 'Data is for demonstration only. Log out and connect your server to use Mira.',
  'settings.legal': 'Terms of Use',

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
  'player.nextEpisode': 'Next episode',
  'player.nextIn': 'Playing in {seconds} s',
  'player.nextWhenReady': 'Playing when it ends',
  'player.playNow': 'Play now',

  'parental.title': 'Parental controls',
  'parental.description': 'Hides adult content categories plus any categories you choose. PIN protected.',
  'parental.blockedCategories': 'Blocked categories',
  'parental.blockedCategories.subtitle': 'Content in checked categories is hidden across the app. Adult categories are blocked automatically.',
  'parental.pin.create': 'Create a 4-digit PIN',
  'parental.pin.confirm': 'Confirm the PIN',
  'parental.pin.enter': 'Enter your PIN',
  'parental.pin.mismatch': "PINs don't match. Try again.",
  'parental.pin.wrong': 'Wrong PIN.',
  'parental.pin.hint': '4-digit PIN',

  'rating.title': 'Enjoying Mira Player?',
  'rating.message': 'Your rating helps us keep improving the app.',
  'rating.rate': 'Rate the app',
  'rating.later': 'Maybe later',
  'rating.never': "Don't ask again",

  'continueWatching.removeTitle': 'Remove from Continue watching',
  'continueWatching.removeMessage': 'Remove "{title}" from Continue watching?',

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

  'settings.profiles': 'Profiles',
  'settings.profiles.subtitle': 'Each profile has its own progress and favorites.',
  'settings.profiles.newProfile': 'New profile',
  'settings.profiles.namePlaceholder': 'Profile name',
  'settings.profiles.create': 'Create profile',
  'settings.profiles.rename': 'Rename profile',
  'settings.profiles.deleteTitle': 'Delete profile',
  'settings.profiles.deleteMessage': '"{nombre}" and its progress and favorites will be deleted. This cannot be undone.',
  'settings.profiles.cannotDeleteActive': 'Switch to another profile before deleting the active one.',

  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.remove': 'Remove',
  'common.save': 'Save',
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
