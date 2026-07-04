import { getDatabase } from '@/db';
import { parentalClauses, type ParentalFilter } from '@/db/repositories/content';
import { uuid } from '@/lib/id';
import type { Contenido, Episodio, Progreso } from '@/types/models';

const COMPLETION_RATIO = 0.95;

export interface ProgressUpdate {
  contentId: string;
  episodeId?: string | null;
  posicionSegundos: number;
  duracionTotal?: number | null;
}

export async function saveProgress(update: ProgressUpdate): Promise<void> {
  const db = await getDatabase();
  const episodeId = update.episodeId ?? null;
  const now = Date.now();
  const completado =
    update.duracionTotal && update.duracionTotal > 0
      ? update.posicionSegundos >= update.duracionTotal * COMPLETION_RATIO
      : false;

  const matchClause =
    episodeId === null ? 'content_id = ? AND episode_id IS NULL' : 'episode_id = ?';
  const matchParam = episodeId === null ? update.contentId : episodeId;

  const result = await db.runAsync(
    `UPDATE progreso
       SET posicion_segundos = ?, duracion_total = COALESCE(?, duracion_total),
           completado = ?, last_watched_at = ?
     WHERE ${matchClause};`,
    [update.posicionSegundos, update.duracionTotal ?? null, completado ? 1 : 0, now, matchParam],
  );

  if (result.changes === 0) {
    await db.runAsync(
      `INSERT INTO progreso
         (id, content_id, episode_id, posicion_segundos, duracion_total, completado, last_watched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        uuid(),
        update.contentId,
        episodeId,
        update.posicionSegundos,
        update.duracionTotal ?? null,
        completado ? 1 : 0,
        now,
      ],
    );
  }
}

export async function setCompleted(
  contentId: string,
  completado: boolean,
  episodeId: string | null = null,
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  const matchClause =
    episodeId === null ? 'content_id = ? AND episode_id IS NULL' : 'episode_id = ?';
  const matchParam = episodeId === null ? contentId : episodeId;

  const result = await db.runAsync(
    `UPDATE progreso SET completado = ?, last_watched_at = ? WHERE ${matchClause};`,
    [completado ? 1 : 0, now, matchParam],
  );

  if (result.changes === 0) {
    await db.runAsync(
      `INSERT INTO progreso
         (id, content_id, episode_id, posicion_segundos, duracion_total, completado, last_watched_at)
       VALUES (?, ?, ?, 0, NULL, ?, ?);`,
      [uuid(), contentId, episodeId, completado ? 1 : 0, now],
    );
  }
}

export async function getProgress(
  contentId: string,
  episodeId: string | null = null,
): Promise<Progreso | null> {
  const db = await getDatabase();
  const matchClause =
    episodeId === null ? 'content_id = ? AND episode_id IS NULL' : 'episode_id = ?';
  const matchParam = episodeId === null ? contentId : episodeId;
  const row = await db.getFirstAsync<Progreso>(
    `SELECT * FROM progreso WHERE ${matchClause};`,
    [matchParam],
  );
  return row ?? null;
}

export async function getSeriesEpisodeProgress(
  serieId: string,
): Promise<Record<string, Progreso>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Progreso>(
    `SELECT p.* FROM progreso p
     JOIN episodios e ON e.id = p.episode_id
     WHERE e.serie_id = ?;`,
    [serieId],
  );
  const map: Record<string, Progreso> = {};
  for (const row of rows) {
    map[row.episode_id as string] = { ...row, completado: Boolean(row.completado) };
  }
  return map;
}

export interface ContinueWatchingItem {
  progreso: Progreso;
  contenido: Contenido;
  episodio: Episodio | null;
}

export async function deleteProgress(progresoId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM progreso WHERE id = ?;', [progresoId]);
}

export async function getContinueWatching(
  cuentaId: string,
  limit = 20,
  parental?: ParentalFilter | null,
): Promise<ContinueWatchingItem[]> {
  const db = await getDatabase();
  const params: (string | number)[] = [cuentaId];
  const extraClauses = parentalClauses(parental, params, 'c.');
  const extraWhere = extraClauses.length > 0 ? ` AND ${extraClauses.join(' AND ')}` : '';
  params.push(limit);
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT
        p.id AS p_id, p.content_id AS p_content_id, p.episode_id AS p_episode_id,
        p.posicion_segundos AS p_pos, p.duracion_total AS p_dur,
        p.completado AS p_completado, p.last_watched_at AS p_last,
        c.*,
        e.id AS e_id, e.serie_id AS e_serie_id, e.temporada AS e_temporada,
        e.episodio AS e_episodio, e.stream_id AS e_stream_id, e.titulo AS e_titulo,
        e.container_extension AS e_ext, e.poster_url AS e_poster, e.duracion AS e_dur
     FROM progreso p
     JOIN contenido c ON c.id = p.content_id
     LEFT JOIN episodios e ON e.id = p.episode_id
     WHERE c.cuenta_id = ? AND p.completado = 0 AND p.posicion_segundos > 0${extraWhere}
     ORDER BY p.last_watched_at DESC
     LIMIT ?;`,
    params,
  );

  return rows.map((r) => ({
    progreso: {
      id: r.p_id as string,
      content_id: r.p_content_id as string,
      episode_id: (r.p_episode_id as string | null) ?? null,
      posicion_segundos: r.p_pos as number,
      duracion_total: (r.p_dur as number | null) ?? null,
      completado: Boolean(r.p_completado),
      last_watched_at: r.p_last as number,
    },
    contenido: {
      id: r.id as string,
      cuenta_id: r.cuenta_id as string,
      tipo: r.tipo as Contenido['tipo'],
      stream_id: r.stream_id as number,
      nombre: r.nombre as string,
      categoria: (r.categoria as string | null) ?? null,
      categoria_id: (r.categoria_id as string | null) ?? null,
      poster_url: (r.poster_url as string | null) ?? null,
      container_extension: (r.container_extension as string | null) ?? null,
      epg_channel_id: (r.epg_channel_id as string | null) ?? null,
      descripcion: (r.descripcion as string | null) ?? null,
      reparto: (r.reparto as string | null) ?? null,
      genero: (r.genero as string | null) ?? null,
      anio: (r.anio as string | null) ?? null,
      duracion_secs: (r.duracion_secs as number | null) ?? null,
      orden: (r.orden as number | null) ?? null,
      created_at: r.created_at as number,
      updated_at: r.updated_at as number,
    },
    episodio: r.e_id
      ? {
          id: r.e_id as string,
          serie_id: r.e_serie_id as string,
          temporada: r.e_temporada as number,
          episodio: r.e_episodio as number,
          stream_id: r.e_stream_id as number,
          titulo: (r.e_titulo as string | null) ?? null,
          container_extension: (r.e_ext as string | null) ?? null,
          poster_url: (r.e_poster as string | null) ?? null,
          duracion: (r.e_dur as number | null) ?? null,
        }
      : null,
  }));
}
