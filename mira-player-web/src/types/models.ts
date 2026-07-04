export type ContentType = 'live' | 'movie' | 'series';

export type ContentSort = 'defecto' | 'nombre_asc' | 'nombre_desc' | 'anio_desc' | 'anio_asc' | 'reciente';

export interface Cuenta {
  id: string;
  servidor: string;
  usuario: string;
  ultima_sincronizacion: number | null;
}

export interface Contenido {
  id: string;
  cuenta_id: string;
  tipo: ContentType;
  stream_id: number;
  nombre: string;
  categoria: string | null;
  categoria_id: string | null;
  poster_url: string | null;
  container_extension: string | null;
  epg_channel_id: string | null;
  descripcion: string | null;
  reparto: string | null;
  genero: string | null;
  anio: string | null;
  duracion_secs: number | null;
  orden: number | null;
  created_at: number;
  updated_at: number;
}

export interface Episodio {
  id: string;
  serie_id: string;
  temporada: number;
  episodio: number;
  stream_id: number;
  titulo: string | null;
  container_extension: string | null;
  poster_url: string | null;
  duracion: number | null;
}

export interface Progreso {
  id: string;
  content_id: string;
  episode_id: string | null;
  posicion_segundos: number;
  duracion_total: number | null;
  completado: boolean;
  last_watched_at: number;
}

export interface Favorito {
  id: string;
  content_id: string;
  created_at: number;
}
