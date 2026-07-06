import { getDatabase } from '@/db';
import { parentalClauses, type ParentalFilter } from '@/db/repositories/content';
import { getActiveProfileId } from '@/db/repositories/sync-meta';
import { uuid } from '@/lib/id';
import type { Contenido, Favorito } from '@/types/models';

export async function isFavorite(contentId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Favorito>(
    'SELECT id FROM favoritos WHERE content_id = ? AND deleted_at IS NULL;',
    [contentId],
  );
  return row != null;
}

export async function toggleFavorite(contentId: string): Promise<boolean> {
  const db = await getDatabase();
  const now = Date.now();
  const profileId = await getActiveProfileId();
  const already = await isFavorite(contentId);
  if (already) {
    await db.runAsync(
      'UPDATE favoritos SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE content_id = ?;',
      [now, now, contentId],
    );
    return false;
  }
  await db.runAsync(
    `INSERT INTO favoritos (id, content_id, created_at, profile_id, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, NULL, 1)
     ON CONFLICT(content_id) DO UPDATE SET
       created_at = excluded.created_at, profile_id = excluded.profile_id,
       updated_at = excluded.updated_at, deleted_at = NULL, dirty = 1;`,
    [uuid(), contentId, now, profileId, now],
  );
  return true;
}

export async function listFavorites(
  cuentaId: string,
  parental?: ParentalFilter | null,
): Promise<Contenido[]> {
  const db = await getDatabase();
  const params: (string | number)[] = [cuentaId];
  const extraClauses = parentalClauses(parental, params, 'c.');
  const extraWhere = extraClauses.length > 0 ? ` AND ${extraClauses.join(' AND ')}` : '';
  return db.getAllAsync<Contenido>(
    `SELECT c.* FROM favoritos f
     JOIN contenido c ON c.id = f.content_id
     WHERE c.cuenta_id = ? AND f.deleted_at IS NULL
       AND (f.profile_id IS NULL OR f.profile_id = (SELECT valor FROM sync_state WHERE clave = 'active_profile_id'))${extraWhere}
     ORDER BY f.created_at DESC;`,
    params,
  );
}
