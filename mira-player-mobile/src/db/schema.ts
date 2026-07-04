import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE cuentas (
    id TEXT PRIMARY KEY NOT NULL,
    servidor TEXT NOT NULL,
    usuario TEXT NOT NULL,
    ultima_sincronizacion INTEGER
  );

  CREATE TABLE contenido (
    id TEXT PRIMARY KEY NOT NULL,
    cuenta_id TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('live','movie','series')),
    stream_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT,
    categoria_id TEXT,
    poster_url TEXT,
    container_extension TEXT,
    epg_channel_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE,
    UNIQUE (cuenta_id, tipo, stream_id)
  );
  CREATE INDEX idx_contenido_cuenta_tipo ON contenido(cuenta_id, tipo);
  CREATE INDEX idx_contenido_categoria ON contenido(cuenta_id, tipo, categoria_id);
  CREATE INDEX idx_contenido_nombre ON contenido(nombre);

  CREATE TABLE episodios (
    id TEXT PRIMARY KEY NOT NULL,
    serie_id TEXT NOT NULL,
    temporada INTEGER NOT NULL,
    episodio INTEGER NOT NULL,
    stream_id INTEGER NOT NULL,
    titulo TEXT,
    container_extension TEXT,
    poster_url TEXT,
    duracion INTEGER,
    FOREIGN KEY (serie_id) REFERENCES contenido(id) ON DELETE CASCADE,
    UNIQUE (serie_id, temporada, episodio)
  );
  CREATE INDEX idx_episodios_serie ON episodios(serie_id);

  CREATE TABLE progreso (
    id TEXT PRIMARY KEY NOT NULL,
    content_id TEXT NOT NULL,
    episode_id TEXT,
    posicion_segundos INTEGER NOT NULL DEFAULT 0,
    duracion_total INTEGER,
    completado INTEGER NOT NULL DEFAULT 0,
    last_watched_at INTEGER NOT NULL,
    FOREIGN KEY (content_id) REFERENCES contenido(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodios(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX idx_progreso_movie ON progreso(content_id) WHERE episode_id IS NULL;
  CREATE UNIQUE INDEX idx_progreso_episode ON progreso(episode_id) WHERE episode_id IS NOT NULL;
  CREATE INDEX idx_progreso_reciente ON progreso(last_watched_at);

  CREATE TABLE favoritos (
    id TEXT PRIMARY KEY NOT NULL,
    content_id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (content_id) REFERENCES contenido(id) ON DELETE CASCADE
  );
  `,

  `
  CREATE TABLE preferencias (
    clave TEXT PRIMARY KEY NOT NULL,
    valor TEXT
  );
  `,

  `
  ALTER TABLE contenido ADD COLUMN descripcion TEXT;
  ALTER TABLE contenido ADD COLUMN reparto TEXT;
  `,

  `
  ALTER TABLE contenido ADD COLUMN genero TEXT;
  ALTER TABLE contenido ADD COLUMN anio TEXT;
  ALTER TABLE contenido ADD COLUMN duracion_secs INTEGER;
  `,

  `
  ALTER TABLE contenido ADD COLUMN orden INTEGER;
  CREATE INDEX idx_contenido_orden ON contenido(cuenta_id, tipo, orden);
  `,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
    });
    await db.execAsync(`PRAGMA user_version = ${version + 1};`);
  }
}

export const SCHEMA_VERSION = MIGRATIONS.length;
