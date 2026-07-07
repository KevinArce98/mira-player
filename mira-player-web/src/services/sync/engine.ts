import { getDatabase } from '@/db';
import { getAccount } from '@/db/repositories/accounts';
import { applyServerProfile } from '@/db/repositories/profiles';
import { uuid } from '@/lib/id';
import { buildCanonicalKey } from '@/lib/canonical';
import { queryClient, queryKeys } from '@/lib/query-client';
import { ensureDefaultProfile, getActiveProfileId, getCursor, setCursor } from '@/db/repositories/sync-meta';
import { deleteSyncSecret, getSyncSecret } from './secret-store';
import { isSyncConfigured } from './config';
import { parseCanonicalKey } from './keys';
import { fetchProfiles, pull, push, type PushFavorite, type PushProgress } from './client';
import { loadSeriesEpisodes } from '@/services/series';

function isUnauthorized(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: number }).status === 401;
}

interface DirtyProgressRow {
  id: string;
  posicion_segundos: number;
  duracion_total: number | null;
  completado: number;
  last_watched_at: number;
  deleted_at: number | null;
  movie_tipo: string | null;
  movie_stream: number | null;
  serie_stream: number | null;
  temp: number | null;
  ep: number | null;
}

interface DirtyFavoriteRow {
  id: string;
  created_at: number;
  deleted_at: number | null;
  tipo: string;
  stream_id: number;
}

let running = false;
let rerunRequested = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function requestSync(delayMs = 1500): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runSync();
  }, delayMs);
}

export async function runSync(): Promise<{ ok: boolean; reason?: string }> {
  if (running) {
    rerunRequested = true;
    return { ok: false, reason: 'busy' };
  }
  if (!isSyncConfigured()) return { ok: false, reason: 'not_configured' };

  const secret = await getSyncSecret();
  const profileId = await getActiveProfileId();
  if (!secret || !profileId) return { ok: false, reason: 'no_session' };

  running = true;
  rerunRequested = false;
  const errors: unknown[] = [];
  try {
    try {
      await pushDirty(secret, profileId);
    } catch (err) {
      errors.push(err);
    }
    try {
      await pullProfiles(secret);
      await pullAndApply(secret, profileId);
    } catch (err) {
      errors.push(err);
    }

    if (errors.some(isUnauthorized)) {
      await recoverFromInvalidSecret();
    }
    if (errors.length > 0) {
      console.warn('[sync] runSync completed with errors:', errors);
      return { ok: false, reason: (errors[0] as Error).message };
    }
    return { ok: true };
  } finally {
    running = false;
    if (rerunRequested) requestSync(0);
  }
}

async function recoverFromInvalidSecret(): Promise<void> {
  console.warn('[sync] secret rejected by server, clearing and re-bootstrapping');
  await deleteSyncSecret();
  const { ensureSyncBootstrapped } = await import('./bootstrap');
  await ensureSyncBootstrapped();
}

async function pushDirty(secret: string, profileId: string): Promise<void> {
  const db = await getDatabase();

  const progressRows = await db.getAllAsync<DirtyProgressRow>(
    `SELECT p.id, p.posicion_segundos, p.duracion_total, p.completado, p.last_watched_at, p.deleted_at,
            cm.tipo AS movie_tipo, cm.stream_id AS movie_stream,
            s.stream_id AS serie_stream, e.temporada AS temp, e.episodio AS ep
     FROM progreso p
     LEFT JOIN contenido cm ON cm.id = p.content_id AND p.episode_id IS NULL
     LEFT JOIN episodios e ON e.id = p.episode_id
     LEFT JOIN contenido s ON s.id = e.serie_id
     WHERE p.dirty = 1 AND p.profile_id = ?;`,
    [profileId],
  );

  const favoriteRows = await db.getAllAsync<DirtyFavoriteRow>(
    `SELECT f.id, f.created_at, f.deleted_at, c.tipo, c.stream_id
     FROM favoritos f JOIN contenido c ON c.id = f.content_id
     WHERE f.dirty = 1 AND f.profile_id = ?;`,
    [profileId],
  );

  const progress: PushProgress[] = [];
  const progressIds: string[] = [];
  for (const r of progressRows) {
    const key = r.movie_tipo
      ? buildCanonicalKey(r.movie_tipo as 'movie', r.movie_stream as number)
      : r.serie_stream != null
        ? buildCanonicalKey('series', r.serie_stream, r.temp, r.ep)
        : null;
    if (!key) continue;
    progress.push({
      canonicalKey: key,
      posicionSegundos: r.posicion_segundos,
      duracionTotal: r.duracion_total,
      completado: Boolean(r.completado),
      lastWatchedAt: r.last_watched_at,
      deletedAt: r.deleted_at,
    });
    progressIds.push(r.id);
  }

  const favorites: PushFavorite[] = [];
  const favoriteIds: string[] = [];
  for (const r of favoriteRows) {
    favorites.push({
      canonicalKey: buildCanonicalKey(r.tipo as 'movie', r.stream_id),
      createdAt: r.created_at,
      deletedAt: r.deleted_at,
    });
    favoriteIds.push(r.id);
  }

  if (progress.length === 0 && favorites.length === 0) return;

  await push(secret, { profileId, progress, favorites });

  if (progressIds.length > 0) {
    await db.runAsync(
      `UPDATE progreso SET dirty = 0 WHERE id IN (${progressIds.map(() => '?').join(',')});`,
      progressIds,
    );
  }
  if (favoriteIds.length > 0) {
    await db.runAsync(
      `UPDATE favoritos SET dirty = 0 WHERE id IN (${favoriteIds.map(() => '?').join(',')});`,
      favoriteIds,
    );
  }
}

async function pullProfiles(secret: string): Promise<void> {
  const { profiles } = await fetchProfiles(secret);
  for (const p of profiles) {
    await applyServerProfile(p);
  }
  await ensureDefaultProfile();
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles });
  queryClient.invalidateQueries({ queryKey: queryKeys.activeProfile });
}

async function pullAndApply(secret: string, profileId: string): Promise<void> {
  const db = await getDatabase();
  const account = await getAccount();
  if (!account) return;

  const since = Number((await getCursor(profileId)) ?? '0');
  const result = await pull(secret, profileId, since);

  const attemptedSeries = new Set<string>();
  let allResolved = true;
  for (const item of result.progress) {
    if (!(await applyPulledProgress(db, account.id, profileId, item, attemptedSeries))) allResolved = false;
  }
  for (const item of result.favorites) {
    if (!(await applyPulledFavorite(db, account.id, profileId, item, attemptedSeries))) allResolved = false;
  }

  if (allResolved) {
    await setCursor(profileId, result.cursor);
  } else {
    console.warn('[sync] some pulled items could not resolve to local content, will retry next sync');
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
  queryClient.invalidateQueries({ queryKey: queryKeys.continueWatching });
}

type Db = Awaited<ReturnType<typeof getDatabase>>;

async function resolveLocalContent(
  db: Db,
  cuentaId: string,
  canonicalKey: string,
  attemptedSeries?: Set<string>,
): Promise<{ contentId: string; episodeId: string | null } | null> {
  const parsed = parseCanonicalKey(canonicalKey);
  if (!parsed) return null;

  if (parsed.tipo === 'series') {
    const serie = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM contenido WHERE cuenta_id = ? AND tipo = ? AND stream_id = ?;',
      [cuentaId, 'series', Number(parsed.streamId)],
    );
    if (!serie) return null;
    if (parsed.temporada == null || parsed.episodio == null) {
      return { contentId: serie.id, episodeId: null };
    }
    let episode = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM episodios WHERE serie_id = ? AND temporada = ? AND episodio = ?;',
      [serie.id, parsed.temporada, parsed.episodio],
    );
    if (!episode && attemptedSeries && !attemptedSeries.has(serie.id)) {
      attemptedSeries.add(serie.id);
      try {
        await loadSeriesEpisodes(serie.id);
      } catch (err) {
        console.warn('[sync] failed to lazily load episodes for series', serie.id, err);
      }
      episode = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM episodios WHERE serie_id = ? AND temporada = ? AND episodio = ?;',
        [serie.id, parsed.temporada, parsed.episodio],
      );
    }
    if (!episode) return null;
    return { contentId: serie.id, episodeId: episode.id };
  }

  const content = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM contenido WHERE cuenta_id = ? AND tipo = ? AND stream_id = ?;',
    [cuentaId, parsed.tipo, Number(parsed.streamId)],
  );
  if (!content) return null;
  return { contentId: content.id, episodeId: null };
}

async function applyPulledProgress(
  db: Db,
  cuentaId: string,
  profileId: string,
  item: PushProgress,
  attemptedSeries: Set<string>,
): Promise<boolean> {
  const local = await resolveLocalContent(db, cuentaId, item.canonicalKey, attemptedSeries);
  if (!local) return false;

  const matchClause =
    local.episodeId === null ? 'content_id = ? AND episode_id IS NULL' : 'episode_id = ?';
  const matchParam = local.episodeId === null ? local.contentId : local.episodeId;

  const result = await db.runAsync(
    `UPDATE progreso
       SET posicion_segundos = ?, duracion_total = COALESCE(?, duracion_total), completado = ?,
           last_watched_at = ?, deleted_at = ?, profile_id = ?, canonical_key = ?, updated_at = ?, dirty = 0
     WHERE ${matchClause};`,
    [
      item.posicionSegundos,
      item.duracionTotal,
      item.completado ? 1 : 0,
      item.lastWatchedAt,
      item.deletedAt,
      profileId,
      item.canonicalKey,
      Date.now(),
      matchParam,
    ],
  );

  if (result.changes === 0 && item.deletedAt === null) {
    await db.runAsync(
      `INSERT INTO progreso
         (id, content_id, episode_id, posicion_segundos, duracion_total, completado, last_watched_at,
          profile_id, canonical_key, updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0);`,
      [
        uuid(),
        local.contentId,
        local.episodeId,
        item.posicionSegundos,
        item.duracionTotal,
        item.completado ? 1 : 0,
        item.lastWatchedAt,
        profileId,
        item.canonicalKey,
        Date.now(),
      ],
    );
  }
  return true;
}

async function applyPulledFavorite(
  db: Db,
  cuentaId: string,
  profileId: string,
  item: PushFavorite,
  attemptedSeries: Set<string>,
): Promise<boolean> {
  const local = await resolveLocalContent(db, cuentaId, item.canonicalKey, attemptedSeries);
  if (!local) return false;
  if (local.episodeId !== null) return true;

  if (item.deletedAt !== null) {
    await db.runAsync('DELETE FROM favoritos WHERE content_id = ?;', [local.contentId]);
    return true;
  }

  await db.runAsync(
    `INSERT INTO favoritos (id, content_id, created_at, profile_id, canonical_key, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 0)
     ON CONFLICT(content_id) DO UPDATE SET
       profile_id = excluded.profile_id, canonical_key = excluded.canonical_key,
       updated_at = excluded.updated_at, deleted_at = NULL, dirty = 0;`,
    [uuid(), local.contentId, item.createdAt, profileId, item.canonicalKey, Date.now()],
  );
  return true;
}
