import type { Database, SqlValue, Statement } from 'sql.js';
import { runMigrations } from './schema';

const IDB_DB_NAME = 'miratv';
const IDB_STORE = 'db';
const IDB_KEY = 'data';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(idb: IDBDatabase): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(idb: IDBDatabase, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(data, IDB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

class WebStatement {
  constructor(
    private readonly sqlDb: Database,
    private readonly stmt: Statement,
    private readonly parent: WebDatabase,
  ) {}

  async executeAsync(params?: Record<string, SqlValue> | SqlValue[]): Promise<{ changes: number }> {
    this.stmt.bind(params as Parameters<Statement['bind']>[0]);
    this.stmt.step();
    const changes = this.sqlDb.getRowsModified();
    this.parent.schedulePersist();
    return { changes };
  }

  async finalizeAsync(): Promise<void> {
    this.stmt.free();
  }
}

export class WebDatabase {
  private dirtyTimer: ReturnType<typeof setTimeout> | null = null;
  private inTransaction = false;

  constructor(
    private readonly sqlDb: Database,
    private readonly idb: IDBDatabase,
  ) {}

  schedulePersist(): void {
    if (this.inTransaction) return;
    if (this.dirtyTimer) clearTimeout(this.dirtyTimer);
    this.dirtyTimer = setTimeout(() => {
      this.dirtyTimer = null;
      void this.persistNow();
    }, 200);
  }

  private async persistNow(): Promise<void> {
    const data = this.sqlDb.export();
    await idbPut(this.idb, data);
  }

  async getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const stmt = this.sqlDb.prepare(sql);
    try {
      if (params) stmt.bind(params as Parameters<Statement['bind']>[0]);
      if (stmt.step()) return stmt.getAsObject() as T;
      return null;
    } finally {
      stmt.free();
    }
  }

  async getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const stmt = this.sqlDb.prepare(sql);
    const results: T[] = [];
    try {
      if (params) stmt.bind(params as Parameters<Statement['bind']>[0]);
      while (stmt.step()) results.push(stmt.getAsObject() as T);
    } finally {
      stmt.free();
    }
    return results;
  }

  async runAsync(
    sql: string,
    params?: unknown[],
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    this.sqlDb.run(sql, params as Parameters<Database['run']>[1]);
    const changes = this.sqlDb.getRowsModified();
    this.schedulePersist();
    return { changes, lastInsertRowId: 0 };
  }

  async execAsync(sql: string): Promise<void> {
    this.sqlDb.exec(sql);
    this.schedulePersist();
  }

  async prepareAsync(sql: string): Promise<WebStatement> {
    const stmt = this.sqlDb.prepare(sql);
    return new WebStatement(this.sqlDb, stmt, this);
  }

  async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
    this.sqlDb.run('BEGIN TRANSACTION');
    this.inTransaction = true;
    try {
      await fn();
      this.sqlDb.run('COMMIT');
    } catch (e) {
      this.sqlDb.run('ROLLBACK');
      throw e;
    } finally {
      this.inTransaction = false;
    }
    await this.persistNow();
  }
}

let dbPromise: Promise<WebDatabase> | null = null;

export function getDatabase(): Promise<WebDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { default: initSqlJs } = await import('sql.js');
      const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
      const idb = await openIDB();
      const saved = await idbGet(idb);
      const sqlDb = saved ? new SQL.Database(saved) : new SQL.Database();
      const db = new WebDatabase(sqlDb, idb);
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}
