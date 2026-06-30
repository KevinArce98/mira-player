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

export async function upsertContentBatch(items: ContentUpsert[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = await getDatabase();
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      `INSERT INTO contenido
         (id, cuenta_id, tipo, stream_id, nombre, categoria, categoria_id,
          poster_url, container_extension, epg_channel_id, created_at, updated_at)
       VALUES ($id, $cuenta, $tipo, $stream, $nombre, $cat, $catId,
               $poster, $ext, $epg, $now, $now)
       ON CONFLICT(cuenta_id, tipo, stream_id) DO UPDATE SET
         nombre = excluded.nombre,
         categoria = excluded.categoria,
         categoria_id = excluded.categoria_id,
         poster_url = excluded.poster_url,
         container_extension = excluded.container_extension,
         epg_channel_id = excluded.epg_channel_id,
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
}

function orderClause(sort: ContentSort = 'nombre_asc'): string {
  switch (sort) {
    case 'nombre_desc': return 'nombre COLLATE NOCASE DESC';
    case 'anio_desc':   return 'CASE WHEN anio IS NULL THEN 1 ELSE 0 END, CAST(anio AS INTEGER) DESC, nombre COLLATE NOCASE ASC';
    case 'anio_asc':    return 'CASE WHEN anio IS NULL THEN 1 ELSE 0 END, CAST(anio AS INTEGER) ASC, nombre COLLATE NOCASE ASC';
    case 'reciente':    return 'updated_at DESC';
    default:            return 'nombre COLLATE NOCASE ASC';
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
): Promise<Contenido[]> {
  const db = await getDatabase();
  return db.getAllAsync<Contenido>(
    `SELECT * FROM contenido WHERE cuenta_id = ? AND nombre LIKE ?
     ORDER BY nombre COLLATE NOCASE LIMIT ?;`,
    [cuentaId, `%${term}%`, limit],
  );
}

export async function getContentById(id: string): Promise<Contenido | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Contenido>('SELECT * FROM contenido WHERE id = ?;', [id]);
  return row ?? null;
}

export async function listCategories(
  cuentaId: string,
  tipo: ContentType,
): Promise<{ categoria_id: string | null; categoria: string | null; total: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT categoria_id, categoria, COUNT(*) as total FROM contenido
     WHERE cuenta_id = ? AND tipo = ?
     GROUP BY categoria_id, categoria ORDER BY categoria COLLATE NOCASE;`,
    [cuentaId, tipo],
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
