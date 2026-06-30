import type {
  EpgNowNext,
  EpgProgram,
  XtreamAuthResponse,
  XtreamCategory,
  XtreamCredentials,
  XtreamLiveStream,
  XtreamSeries,
  XtreamSeriesInfo,
  XtreamShortEpgEntry,
  XtreamShortEpgResponse,
  XtreamVodInfo,
  XtreamVodStream,
} from '@/types/xtream';

export class XtreamError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'XtreamError';
  }
}

export function normalizeServer(server: string): string {
  const trimmed = server.trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new XtreamError(`URL de servidor inválida: "${server}" (falta http:// o https://)`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new XtreamError(`URL de servidor inválida: el protocolo debe ser http o https.`);
  }
  if (!url.hostname) {
    throw new XtreamError(`URL de servidor inválida: falta el host.`);
  }
  return trimmed;
}

export class XtreamClient {
  private readonly server: string;
  private readonly username: string;
  private readonly password: string;

  constructor(creds: XtreamCredentials) {
    this.server = normalizeServer(creds.server);
    this.username = creds.username;
    this.password = creds.password;
  }

  private apiUrl(params: Record<string, string | number | undefined>): string {
    const query: Record<string, string | number | undefined> = {
      username: this.username,
      password: this.password,
      ...params,
    };
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${this.server}/player_api.php?${qs}`;
  }

  liveStreamUrl(streamId: number, ext: 'm3u8' | 'ts' = 'm3u8'): string {
    return XtreamClient.streamUrl(`${this.server}/live/${this.username}/${this.password}/${streamId}.${ext}`);
  }

  movieStreamUrl(streamId: number, containerExtension: string): string {
    return XtreamClient.streamUrl(`${this.server}/movie/${this.username}/${this.password}/${streamId}.${containerExtension}`);
  }

  seriesStreamUrl(episodeId: string | number, containerExtension: string): string {
    return XtreamClient.streamUrl(`${this.server}/series/${this.username}/${this.password}/${episodeId}.${containerExtension}`);
  }

  private static proxyIfNeeded(url: string): string {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.startsWith('http:')
    ) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  private static streamUrl(url: string): string {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.startsWith('http:')
    ) {
      return `/api/stream?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  private async get<T>(params: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<T> {
    const url = XtreamClient.proxyIfNeeded(this.apiUrl(params));
    let res: Response;
    try {
      res = await fetch(url, { signal });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new XtreamError(`No se pudo conectar con el servidor Xtream. [${detail}]`, err);
    }
    if (!res.ok) {
      throw new XtreamError(`El servidor respondió ${res.status} ${res.statusText}.`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new XtreamError('Respuesta no válida del servidor (no es JSON).', err);
    }
  }

  async authenticate(signal?: AbortSignal): Promise<XtreamAuthResponse> {
    const data = await this.get<XtreamAuthResponse>({}, signal);
    if (!data?.user_info || Number(data.user_info.auth) !== 1) {
      throw new XtreamError('Credenciales rechazadas por el servidor.');
    }
    if (data.user_info.status && data.user_info.status !== 'Active') {
      throw new XtreamError(`La cuenta no está activa (estado: ${data.user_info.status}).`);
    }
    return data;
  }

  liveCategories(signal?: AbortSignal) {
    return this.get<XtreamCategory[]>({ action: 'get_live_categories' }, signal);
  }

  vodCategories(signal?: AbortSignal) {
    return this.get<XtreamCategory[]>({ action: 'get_vod_categories' }, signal);
  }

  seriesCategories(signal?: AbortSignal) {
    return this.get<XtreamCategory[]>({ action: 'get_series_categories' }, signal);
  }

  liveStreams(categoryId?: string, signal?: AbortSignal) {
    return this.get<XtreamLiveStream[]>({ action: 'get_live_streams', category_id: categoryId }, signal);
  }

  vodStreams(categoryId?: string, signal?: AbortSignal) {
    return this.get<XtreamVodStream[]>({ action: 'get_vod_streams', category_id: categoryId }, signal);
  }

  series(categoryId?: string, signal?: AbortSignal) {
    return this.get<XtreamSeries[]>({ action: 'get_series', category_id: categoryId }, signal);
  }

  seriesInfo(seriesId: number, signal?: AbortSignal) {
    return this.get<XtreamSeriesInfo>({ action: 'get_series_info', series_id: seriesId }, signal);
  }

  vodInfo(vodId: number, signal?: AbortSignal) {
    return this.get<XtreamVodInfo>({ action: 'get_vod_info', vod_id: vodId }, signal);
  }

  async shortEpg(streamId: number, signal?: AbortSignal): Promise<EpgNowNext> {
    const data = await this.get<XtreamShortEpgResponse | XtreamShortEpgEntry[]>(
      { action: 'get_short_epg', stream_id: streamId, limit: 8 },
      signal,
    );
    const listings = Array.isArray(data) ? data : (data?.epg_listings ?? []);
    const entries = listings
      .map((e) => ({
        program: {
          title: decodeBase64(e.title),
          description: decodeBase64(e.description),
          startTimestamp: epgTimestamp(e.start_timestamp, e.start),
          stopTimestamp: epgTimestamp(e.stop_timestamp, e.end),
        } as EpgProgram,
        nowPlaying: Number(e.now_playing) === 1,
      }))
      .filter((e) => e.program.title);

    if (entries.length === 0) return { now: null, next: null };

    const nowMs = Date.now();
    let nowIndex = entries.findIndex((e) => e.nowPlaying);
    if (nowIndex < 0) {
      nowIndex = entries.findIndex(
        (e) =>
          e.program.startTimestamp > 0 &&
          e.program.startTimestamp <= nowMs &&
          (e.program.stopTimestamp === 0 || e.program.stopTimestamp > nowMs),
      );
    }
    if (nowIndex < 0) nowIndex = 0;

    return {
      now: entries[nowIndex]?.program ?? null,
      next: entries[nowIndex + 1]?.program ?? null,
    };
  }
}

function epgTimestamp(unixSeconds: string | undefined, datetime: string | undefined): number {
  const unix = Number(unixSeconds);
  if (Number.isFinite(unix) && unix > 0) return unix * 1000;
  if (datetime) {
    const parsed = Date.parse(datetime.replace(' ', 'T'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function looksBase64(value: string): boolean {
  return value.length >= 4 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function decodeBase64(value: string | null | undefined): string {
  if (!value) return '';
  if (typeof atob !== 'function' || !looksBase64(value)) return value;
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return value;
  }
}
