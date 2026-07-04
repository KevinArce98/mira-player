import { getDatabase } from '@/db';
import { parentalClauses, type ParentalFilter } from '@/db/repositories/content';
import { uuid } from '@/lib/id';
import type { Contenido, Favorito } from '@/types/models';

export async function isFavorite(contentId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Favorito>('SELECT id FROM favoritos WHERE content_id = ?;', [
    contentId,
  ]);
  return row != null;
}

export async function toggleFavorite(contentId: string): Promise<boolean> {
  const db = await getDatabase();
  const already = await isFavorite(contentId);
  if (already) {
    await db.runAsync('DELETE FROM favoritos WHERE content_id = ?;', [contentId]);
    return false;
  }
  await db.runAsync('INSERT INTO favoritos (id, content_id, created_at) VALUES (?, ?, ?);', [
    uuid(),
    contentId,
    Date.now(),
  ]);
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
     WHERE c.cuenta_id = ?${extraWhere}
     ORDER BY f.created_at DESC;`,
    params,
  );
}
