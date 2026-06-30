import { getContentById } from '@/db/repositories/content';
import { listEpisodes, upsertEpisodesBatch, type EpisodeUpsert } from '@/db/repositories/episodes';
import { getAccount } from '@/db/repositories/accounts';
import { clientFromAccount } from '@/services/xtream/from-account';
import { XtreamError } from '@/services/xtream/client';
import type { Episodio } from '@/types/models';

export async function loadSeriesEpisodes(serieId: string): Promise<Episodio[]> {
  const serie = await getContentById(serieId);
  if (!serie || serie.tipo !== 'series') {
    throw new XtreamError('La serie indicada no existe en el catálogo local.');
  }
  const cuenta = await getAccount();
  if (!cuenta) throw new XtreamError('No hay cuenta configurada.');

  const client = await clientFromAccount(cuenta);
  const info = await client.seriesInfo(serie.stream_id);

  const items: EpisodeUpsert[] = [];
  for (const [seasonKey, episodes] of Object.entries(info.episodes ?? {})) {
    for (const ep of episodes) {
      items.push({
        serie_id: serieId,
        temporada: Number(ep.season ?? seasonKey),
        episodio: Number(ep.episode_num),
        stream_id: Number(ep.id),
        titulo: ep.title ?? null,
        container_extension: ep.container_extension ?? null,
        poster_url: ep.info?.movie_image ?? null,
        duracion: ep.info?.duration_secs ?? null,
      });
    }
  }

  await upsertEpisodesBatch(items);
  return listEpisodes(serieId);
}
