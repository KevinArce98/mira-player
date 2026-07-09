import { getDatabase } from '@/db';
import { uuid } from '@/lib/id';
import type { Contenido, ContentSort, ContentType } from '@/types/models';

export type ContentUpsert = Omit<
  Contenido,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'descripcion'
  | 'reparto'
  | 'genero'
  | 'anio'
  | 'duracion_secs'
>;

export interface ParentalFilter {
  blockedCategoryIds: string[];
}

const ADULT_NAME_PATTERNS = ['%adult%', '%xxx%', '%porn%', '%eroti%', '%18+%', '%+18%'];

export function parentalClauses(
  filter: ParentalFilter | null | undefined,
  params: (string | number)[],
  prefix = '',
): string[] {
  if (!filter) return [];
  const clauses: string[] = [];
  const nameChecks = ADULT_NAME_PATTERNS.map(() => `LOWER(${prefix}categoria) NOT LIKE ?`).join(' AND ');
  clauses.push(`(${prefix}categoria IS NULL OR (${nameChecks}))`);
  params.push(...ADULT_NAME_PATTERNS);
  if (filter.blockedCategoryIds.length > 0) {
    const placeholders = filter.blockedCategoryIds.map(() => '?').join(', ');
    clauses.push(`(${prefix}categoria_id IS NULL OR ${prefix}categoria_id NOT IN (${placeholders}))`);
    params.push(...filter.blockedCategoryIds);
  }
  return clauses;
}

export async function upsertContentBatch(items: ContentUpsert[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = await getDatabase();
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      `INSERT INTO contenido
         (id, cuenta_id, tipo, stream_id, nombre, categoria, categoria_id,
          poster_url, container_extension, epg_channel_id, orden, created_at, updated_at)
       VALUES ($id, $cuenta, $tipo, $stream, $nombre, $cat, $catId,
               $poster, $ext, $epg, $orden, $now, $now)
       ON CONFLICT(cuenta_id, tipo, stream_id) DO UPDATE SET
         nombre = excluded.nombre,
         categoria = excluded.categoria,
         categoria_id = excluded.categoria_id,
         poster_url = excluded.poster_url,
         container_extension = excluded.container_extension,
         epg_channel_id = excluded.epg_channel_id,
         orden = excluded.orden,
         updated_at = excluded.updated_at;`,
    );
    try {
      for (const it of items) {
        await stmt.executeAsync({
          $id: uuid(),
          $cuenta: it.cuenta_id,
          $tipo: it.tipo,
          $stream: it.stream_id,
          $nombre: it.nombre,
          $cat: it.categoria,
          $catId: it.categoria_id,
          $poster: it.poster_url,
          $ext: it.container_extension,
          $epg: it.epg_channel_id,
          $orden: it.orden,
          $now: now,
        });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });

  return items.length;
}

export interface ContentQuery {
  cuentaId: string;
  tipo: ContentType;
  categoriaId?: string;
  search?: string;
  sort?: ContentSort;
  limit?: number;
  offset?: number;
  parental?: ParentalFilter | null;
}

function orderClause(sort: ContentSort = 'defecto'): string {
  switch (sort) {
    case 'nombre_asc':  return 'nombre COLLATE NOCASE ASC';
    case 'nombre_desc': return 'nombre COLLATE NOCASE DESC';
    case 'anio_desc':   return 'CASE WHEN anio IS NULL THEN 1 ELSE 0 END, CAST(anio AS INTEGER) DESC, nombre COLLATE NOCASE ASC';
    case 'anio_asc':    return 'CASE WHEN anio IS NULL THEN 1 ELSE 0 END, CAST(anio AS INTEGER) ASC, nombre COLLATE NOCASE ASC';
    case 'reciente':    return 'updated_at DESC';
    default:            return 'CASE WHEN orden IS NULL THEN 1 ELSE 0 END, orden ASC, nombre COLLATE NOCASE ASC';
  }
}

export async function queryContent(q: ContentQuery): Promise<Contenido[]> {
  const db = await getDatabase();
  const where: string[] = ['cuenta_id = ?', 'tipo = ?'];
  const params: (string | number)[] = [q.cuentaId, q.tipo];

  if (q.categoriaId) {
    where.push('categoria_id = ?');
    params.push(q.categoriaId);
  }
  if (q.search) {
    where.push('nombre LIKE ?');
    params.push(`%${q.search}%`);
  }
  where.push(...parentalClauses(q.parental, params));
  params.push(q.limit ?? 100, q.offset ?? 0);

  return db.getAllAsync<Contenido>(
    `SELECT * FROM contenido WHERE ${where.join(' AND ')} ORDER BY ${orderClause(q.sort)} LIMIT ? OFFSET ?;`,
    params,
  );
}

export async function countContent(q: {
  cuentaId: string;
  tipo: ContentType;
  categoriaId?: string;
  search?: string;
  parental?: ParentalFilter | null;
}): Promise<number> {
  const db = await getDatabase();
  const where: string[] = ['cuenta_id = ?', 'tipo = ?'];
  const params: (string | number)[] = [q.cuentaId, q.tipo];

  if (q.categoriaId) {
    where.push('categoria_id = ?');
    params.push(q.categoriaId);
  }
  if (q.search) {
    where.push('nombre LIKE ?');
    params.push(`%${q.search}%`);
  }
  where.push(...parentalClauses(q.parental, params));

  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM contenido WHERE ${where.join(' AND ')};`,
    params,
  );
  return row?.total ?? 0;
}

export async function searchAllContent(
  cuentaId: string,
  term: string,
  limit = 50,
  parental?: ParentalFilter | null,
): Promise<Contenido[]> {
  const db = await getDatabase();
  const where: string[] = ['cuenta_id = ?', 'nombre LIKE ?'];
  const params: (string | number)[] = [cuentaId, `%${term}%`];
  where.push(...parentalClauses(parental, params));
  params.push(limit);
  return db.getAllAsync<Contenido>(
    `SELECT * FROM contenido WHERE ${where.join(' AND ')}
     ORDER BY nombre COLLATE NOCASE LIMIT ?;`,
    params,
  );
}

export async function getContentById(
  id: string,
  parental?: ParentalFilter | null,
): Promise<Contenido | null> {
  const db = await getDatabase();
  const params: (string | number)[] = [id];
  const extraClauses = parentalClauses(parental, params);
  const extraWhere = extraClauses.length > 0 ? ` AND ${extraClauses.join(' AND ')}` : '';
  const row = await db.getFirstAsync<Contenido>(
    `SELECT * FROM contenido WHERE id = ?${extraWhere};`,
    params,
  );
  return row ?? null;
}

export async function listCategories(
  cuentaId: string,
  tipo: ContentType,
  parental?: ParentalFilter | null,
): Promise<{ categoria_id: string | null; categoria: string | null; total: number }[]> {
  const db = await getDatabase();
  const where: string[] = ['cuenta_id = ?', 'tipo = ?'];
  const params: (string | number)[] = [cuentaId, tipo];
  where.push(...parentalClauses(parental, params));
  return db.getAllAsync(
    `SELECT categoria_id, categoria, COUNT(*) as total, MIN(orden) as orden_min FROM contenido
     WHERE ${where.join(' AND ')}
     GROUP BY categoria_id, categoria
     ORDER BY CASE WHEN MIN(orden) IS NULL THEN 1 ELSE 0 END, MIN(orden), categoria COLLATE NOCASE;`,
    params,
  );
}

export async function updateContentDetails(
  id: string,
  details: {
    descripcion: string | null;
    reparto: string | null;
    genero: string | null;
    anio: string | null;
    duracion_secs: number | null;
  },
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE contenido
       SET descripcion = ?, reparto = ?, genero = ?, anio = ?, duracion_secs = ?, updated_at = ?
     WHERE id = ?;`,
    [details.descripcion, details.reparto, details.genero, details.anio, details.duracion_secs, Date.now(), id],
  );
}
