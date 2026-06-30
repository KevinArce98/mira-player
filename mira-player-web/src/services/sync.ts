import { updateLastSync } from '@/db/repositories/accounts';
import { upsertContentBatch, type ContentUpsert } from '@/db/repositories/content';
import { clientFromAccount } from '@/services/xtream/from-account';
import type { XtreamCategory } from '@/types/xtream';
import type { Cuenta } from '@/types/models';

export type SyncStage = 'live' | 'movies' | 'series' | 'done';

export interface SyncProgress {
  stage: SyncStage;
  written: number;
}

export type SyncProgressCallback = (p: SyncProgress) => void;

function safePosterUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

function categoryNameMap(categories: XtreamCategory[]): Map<string, string> {
  return new Map(categories.map((c) => [c.category_id, c.category_name]));
}

export async function syncCatalog(
  cuenta: Cuenta,
  onProgress?: SyncProgressCallback,
  signal?: AbortSignal,
): Promise<number> {
  const client = await clientFromAccount(cuenta);
  let written = 0;

  const [liveCats, liveStreams] = await Promise.all([
    client.liveCategories(signal),
    client.liveStreams(undefined, signal),
  ]);
  const liveNames = categoryNameMap(liveCats);
  const liveItems: ContentUpsert[] = liveStreams.map((s) => ({
    cuenta_id: cuenta.id,
    tipo: 'live',
    stream_id: s.stream_id,
    nombre: s.name,
    categoria: s.category_id ? (liveNames.get(s.category_id) ?? null) : null,
    categoria_id: s.category_id,
    poster_url: safePosterUrl(s.stream_icon),
    container_extension: null,
    epg_channel_id: s.epg_channel_id,
  }));
  written += await upsertContentBatch(liveItems);
  onProgress?.({ stage: 'live', written });

  const [vodCats, vodStreams] = await Promise.all([
    client.vodCategories(signal),
    client.vodStreams(undefined, signal),
  ]);
  const vodNames = categoryNameMap(vodCats);
  const vodItems: ContentUpsert[] = vodStreams.map((s) => ({
    cuenta_id: cuenta.id,
    tipo: 'movie',
    stream_id: s.stream_id,
    nombre: s.name,
    categoria: s.category_id ? (vodNames.get(s.category_id) ?? null) : null,
    categoria_id: s.category_id,
    poster_url: safePosterUrl(s.stream_icon),
    container_extension: s.container_extension,
    epg_channel_id: null,
  }));
  written += await upsertContentBatch(vodItems);
  onProgress?.({ stage: 'movies', written });

  const [seriesCats, seriesList] = await Promise.all([
    client.seriesCategories(signal),
    client.series(undefined, signal),
  ]);
  const seriesNames = categoryNameMap(seriesCats);
  const seriesItems: ContentUpsert[] = seriesList.map((s) => ({
    cuenta_id: cuenta.id,
    tipo: 'series',
    stream_id: s.series_id,
    nombre: s.name,
    categoria: s.category_id ? (seriesNames.get(s.category_id) ?? null) : null,
    categoria_id: s.category_id,
    poster_url: safePosterUrl(s.cover),
    container_extension: null,
    epg_channel_id: null,
  }));
  written += await upsertContentBatch(seriesItems);
  onProgress?.({ stage: 'series', written });

  await updateLastSync(cuenta.id);
  onProgress?.({ stage: 'done', written });
  return written;
}
