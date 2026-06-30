export interface XtreamCredentials {
  server: string;
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  username: string;
  password: string;
  status: string;
  auth: number | string;
  exp_date: string | null;
  is_trial: string;
  active_cons: string;
  max_connections: string;
  created_at?: string;
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port?: string;
  server_protocol?: 'http' | 'https';
  timezone?: string;
  time_now?: string;
}

export interface XtreamAuthResponse {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number | string;
}

export interface XtreamLiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string | null;
  epg_channel_id: string | null;
  added: string;
  category_id: string | null;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number | string;
}

export interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string | null;
  rating: string | number;
  rating_5based: number;
  added: string;
  category_id: string | null;
  container_extension: string | null;
  direct_source: string;
}

export interface XtreamSeries {
  num: number;
  name: string;
  series_id: number;
  cover: string | null;
  plot: string | null;
  cast: string | null;
  director: string | null;
  genre: string | null;
  releaseDate: string | null;
  last_modified: string | null;
  rating: string | number;
  rating_5based: number;
  category_id: string | null;
}

export interface XtreamEpisode {
  id: string;
  episode_num: number | string;
  title: string;
  container_extension: string;
  season: number | string;
  added?: string;
  info?: {
    duration_secs?: number;
    duration?: string;
    movie_image?: string;
    plot?: string;
  };
}

export interface XtreamSeriesInfo {
  seasons: { season_number: number | string; name?: string; cover?: string }[];
  info: {
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
  };
  episodes: Record<string, XtreamEpisode[]>;
}

export interface XtreamVodInfo {
  info: {
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releasedate?: string;
    releaseDate?: string;
    duration_secs?: number;
    duration?: string;
    rating?: string | number;
    youtube_trailer?: string;
  };
  movie_data?: {
    stream_id: number;
    name: string;
    container_extension?: string;
  };
}

export interface XtreamShortEpgEntry {
  id: string;
  epg_id: string;
  title: string;
  lang: string;
  start: string;
  end: string;
  description: string;
  channel_id: string;
  start_timestamp: string;
  stop_timestamp: string;
  now_playing?: number;
  has_archive?: number;
}

export interface XtreamShortEpgResponse {
  epg_listings: XtreamShortEpgEntry[];
}

export interface EpgNowNext {
  now: EpgProgram | null;
  next: EpgProgram | null;
}

export interface EpgProgram {
  title: string;
  description: string;
  startTimestamp: number;
  stopTimestamp: number;
}
