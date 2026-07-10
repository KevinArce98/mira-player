import * as SQLite from 'expo-sqlite';
import { runMigrations } from './schema';
import { normalizeSearchText } from '@/lib/search-text';

const DB_NAME = 'miratv.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function backfillNormalizedNames(db: SQLite.SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ id: string; nombre: string }>(
    'SELECT id, nombre FROM contenido WHERE nombre_normalizado IS NULL;',
  );
  if (rows.length === 0) return;
  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync('UPDATE contenido SET nombre_normalizado = $norm WHERE id = $id;');
    try {
      for (const row of rows) {
        await stmt.executeAsync({ $norm: normalizeSearchText(row.nombre), $id: row.id });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await runMigrations(db);
      await backfillNormalizedNames(db);
      return db;
    })();
  }
  return dbPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
