import { updateLastSync } from '@/db/repositories/accounts';
import { upsertContentBatch, type ContentUpsert } from '@/db/repositories/content';
import type { EpisodeUpsert } from '@/db/repositories/episodes';
import type { Cuenta } from '@/types/models';

export const DEMO_SERVER = 'http://demo.mira-player.local';

export function isDemoAccount(cuenta: Cuenta): boolean {
  return cuenta.servidor === DEMO_SERVER;
}

const MUX = 'https://test-streams.mux.dev';
const APPLE = 'https://devstreaming-cdn.apple.com/videos/streaming/examples';
const AKAMAI = 'https://bitdash-a.akamaihd.net/content';

const DEMO_MEDIA: Record<number, string> = {
  2001: `${MUX}/x36xhzz/x36xhzz.m3u8`,
  2002: `${AKAMAI}/MI201109210084_mpeg-4/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8`,
  2003: `${AKAMAI}/sintel/hls/playlist.m3u8`,
  2004: `${MUX}/tos_ismc/main.m3u8`,
  2005: `${APPLE}/bipbop_4x3/bipbop_4x3_variant.m3u8`,
  2006: `${APPLE}/img_bipbop_adv_example_fmp4/master.m3u8`,

  30011: `${APPLE}/bipbop_4x3/bipbop_4x3_variant.m3u8`,
  30012: `${MUX}/pts_shift/master.m3u8`,
  30013: `${AKAMAI}/sintel/hls/playlist.m3u8`,
  30021: `${MUX}/x36xhzz/x36xhzz.m3u8`,
  30022: `${MUX}/tos_ismc/main.m3u8`,
};

export function getDemoPlaybackUrl(streamId: number): string | null {
  return DEMO_MEDIA[streamId] ?? null;
}

const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/thumb';

const POSTER_BIG_BUCK_BUNNY = `${WIKI}/c/c5/Big_buck_bunny_poster_big.jpg/500px-Big_buck_bunny_poster_big.jpg`;
const POSTER_ELEPHANTS_DREAM = `${WIKI}/e/e4/Elephants_Dream_cover.jpg/500px-Elephants_Dream_cover.jpg`;
const POSTER_SINTEL = `${WIKI}/8/8f/Sintel_poster.jpg/500px-Sintel_poster.jpg`;
const POSTER_TEARS_OF_STEEL = `${WIKI}/f/fe/Tears_of_Steel_frame_04_5h.jpg/500px-Tears_of_Steel_frame_04_5h.jpg`;
const POSTER_COSMOS_LAUNDROMAT = `${WIKI}/c/c5/CosmosLaundromatPoster.jpg/500px-CosmosLaundromatPoster.jpg`;
const POSTER_SPRING = `${WIKI}/3/30/Blender_Open_Movie_-_Spring_%282019%29.png/500px-Blender_Open_Movie_-_Spring_%282019%29.png`;
const POSTER_CAMINANDES = `${WIKI}/a/aa/Blender_Foundation_-_Caminandes_-_Episode_3_-_Llamigos_-_Cover_thumbnail.png/500px-Blender_Foundation_-_Caminandes_-_Episode_3_-_Llamigos_-_Cover_thumbnail.png`;

const DEMO_MOVIES: Omit<ContentUpsert, 'cuenta_id'>[] = [
  { tipo: 'movie', stream_id: 2001, nombre: 'Big Buck Bunny',          categoria: 'Open Movies', categoria_id: 'demo_movies', poster_url: POSTER_BIG_BUCK_BUNNY,    container_extension: 'mp4', epg_channel_id: null },
  { tipo: 'movie', stream_id: 2002, nombre: 'Elephants Dream',         categoria: 'Open Movies', categoria_id: 'demo_movies', poster_url: POSTER_ELEPHANTS_DREAM,   container_extension: 'mp4', epg_channel_id: null },
  { tipo: 'movie', stream_id: 2003, nombre: 'Sintel',                  categoria: 'Open Movies', categoria_id: 'demo_movies', poster_url: POSTER_SINTEL,            container_extension: 'mp4', epg_channel_id: null },
  { tipo: 'movie', stream_id: 2004, nombre: 'Tears of Steel',          categoria: 'Open Movies', categoria_id: 'demo_movies', poster_url: POSTER_TEARS_OF_STEEL,    container_extension: 'mp4', epg_channel_id: null },
  { tipo: 'movie', stream_id: 2005, nombre: 'Cosmos Laundromat',       categoria: 'Open Movies', categoria_id: 'demo_movies', poster_url: POSTER_COSMOS_LAUNDROMAT, container_extension: 'mp4', epg_channel_id: null },
  { tipo: 'movie', stream_id: 2006, nombre: 'Caminandes: Llamigos',    categoria: 'Shorts',      categoria_id: 'demo_shorts', poster_url: POSTER_CAMINANDES,        container_extension: 'mp4', epg_channel_id: null },
];

const DEMO_SERIES: Omit<ContentUpsert, 'cuenta_id'>[] = [
  { tipo: 'series', stream_id: 3001, nombre: 'Blender Open Movies', categoria: 'Open Content', categoria_id: 'demo_series', poster_url: POSTER_SINTEL,  container_extension: null, epg_channel_id: null },
  { tipo: 'series', stream_id: 3002, nombre: 'Short Films',         categoria: 'Open Content', categoria_id: 'demo_series', poster_url: POSTER_SPRING,  container_extension: null, epg_channel_id: null },
];

const DEMO_EPISODES_BY_SERIES: Record<number, Omit<EpisodeUpsert, 'serie_id'>[]> = {
  3001: [
    { temporada: 1, episodio: 1, stream_id: 30011, titulo: 'Big Buck Bunny',  container_extension: 'mp4', poster_url: POSTER_BIG_BUCK_BUNNY,  duracion: 596 },
    { temporada: 1, episodio: 2, stream_id: 30012, titulo: 'Elephants Dream', container_extension: 'mp4', poster_url: POSTER_ELEPHANTS_DREAM, duracion: 654 },
    { temporada: 1, episodio: 3, stream_id: 30013, titulo: 'Sintel',          container_extension: 'mp4', poster_url: POSTER_SINTEL,          duracion: 888 },
  ],
  3002: [
    { temporada: 1, episodio: 1, stream_id: 30021, titulo: 'Tears of Steel',    container_extension: 'mp4', poster_url: POSTER_TEARS_OF_STEEL,    duracion: 734 },
    { temporada: 1, episodio: 2, stream_id: 30022, titulo: 'Cosmos Laundromat', container_extension: 'mp4', poster_url: POSTER_COSMOS_LAUNDROMAT, duracion: 987 },
  ],
};

export function getDemoEpisodes(serieId: string, serieStreamId: number): EpisodeUpsert[] {
  const episodes = DEMO_EPISODES_BY_SERIES[serieStreamId] ?? [];
  return episodes.map((ep) => ({ ...ep, serie_id: serieId }));
}

function withAccount(items: Omit<ContentUpsert, 'cuenta_id'>[], cuentaId: string): ContentUpsert[] {
  return items.map((item) => ({ ...item, cuenta_id: cuentaId }));
}

export async function syncDemoCatalog(cuenta: Cuenta): Promise<number> {
  const movies = await upsertContentBatch(withAccount(DEMO_MOVIES, cuenta.id));
  const series = await upsertContentBatch(withAccount(DEMO_SERIES, cuenta.id));
  await updateLastSync(cuenta.id);
  return movies + series;
}
