import { getDatabase } from '@/db';
import { uuid } from '@/lib/id';
import type { Episodio } from '@/types/models';

export type EpisodeUpsert = Omit<Episodio, 'id'>;

export async function upsertEpisodesBatch(items: EpisodeUpsert[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      `INSERT INTO episodios
         (id, serie_id, temporada, episodio, stream_id, titulo, container_extension, poster_url, duracion)
       VALUES ($id, $serie, $temp, $epi, $stream, $titulo, $ext, $poster, $dur)
       ON CONFLICT(serie_id, temporada, episodio) DO UPDATE SET
         stream_id = excluded.stream_id,
         titulo = excluded.titulo,
         container_extension = excluded.container_extension,
         poster_url = excluded.poster_url,
         duracion = excluded.duracion;`,
    );
    try {
      for (const it of items) {
        await stmt.executeAsync({
          $id: uuid(),
          $serie: it.serie_id,
          $temp: it.temporada,
          $epi: it.episodio,
          $stream: it.stream_id,
          $titulo: it.titulo,
          $ext: it.container_extension,
          $poster: it.poster_url,
          $dur: it.duracion,
        });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });

  return items.length;
}

export async function listEpisodes(serieId: string): Promise<Episodio[]> {
  const db = await getDatabase();
  return db.getAllAsync<Episodio>(
    'SELECT * FROM episodios WHERE serie_id = ? ORDER BY temporada, episodio;',
    [serieId],
  );
}

export async function getEpisodeById(id: string): Promise<Episodio | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Episodio>('SELECT * FROM episodios WHERE id = ?;', [id]);
  return row ?? null;
}

export async function getNextEpisode(
  serieId: string,
  temporada: number,
  episodio: number,
): Promise<Episodio | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Episodio>(
    `SELECT * FROM episodios
     WHERE serie_id = ? AND (temporada > ? OR (temporada = ? AND episodio > ?))
     ORDER BY temporada, episodio LIMIT 1;`,
    [serieId, temporada, temporada, episodio],
  );
  return row ?? null;
}
