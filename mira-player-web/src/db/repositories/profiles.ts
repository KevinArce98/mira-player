import { getDatabase } from '@/db';
import { uuid } from '@/lib/id';

export interface Perfil {
  id: string;
  nombre: string;
  avatar: string | null;
  is_kids: boolean;
  pin_hash: string | null;
  pin_salt: string | null;
  updated_at: number;
  deleted_at: number | null;
}

interface PerfilRow extends Omit<Perfil, 'is_kids'> {
  is_kids: number;
  dirty: number;
}

function mapRow(row: PerfilRow): Perfil {
  return {
    id: row.id,
    nombre: row.nombre,
    avatar: row.avatar,
    is_kids: Boolean(row.is_kids),
    pin_hash: row.pin_hash,
    pin_salt: row.pin_salt,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export async function listProfiles(): Promise<Perfil[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PerfilRow>(
    'SELECT * FROM perfiles WHERE deleted_at IS NULL ORDER BY updated_at ASC;',
  );
  return rows.map(mapRow);
}

export async function getProfile(id: string): Promise<Perfil | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PerfilRow>('SELECT * FROM perfiles WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export interface CreateProfileInput {
  id?: string;
  nombre: string;
  avatar?: string | null;
  isKids?: boolean;
  pinHash?: string | null;
  pinSalt?: string | null;
}

export async function createProfile(input: CreateProfileInput): Promise<Perfil> {
  const db = await getDatabase();
  const id = input.id ?? uuid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO perfiles (id, nombre, avatar, is_kids, pin_hash, pin_salt, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET
       nombre = excluded.nombre, avatar = excluded.avatar, is_kids = excluded.is_kids,
       pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt,
       updated_at = excluded.updated_at, deleted_at = NULL, dirty = 1;`,
    [id, input.nombre, input.avatar ?? null, input.isKids ? 1 : 0, input.pinHash ?? null, input.pinSalt ?? null, now],
  );
  return (await getProfile(id)) as Perfil;
}

export interface ServerProfile {
  id: string;
  nombre: string;
  avatar: string | null;
  isKids: boolean;
  deletedAt: number | null;
}

export async function applyServerProfile(input: ServerProfile): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO perfiles (id, nombre, avatar, is_kids, pin_hash, pin_salt, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       nombre = excluded.nombre, avatar = excluded.avatar, is_kids = excluded.is_kids,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, dirty = 0;`,
    [input.id, input.nombre, input.avatar, input.isKids ? 1 : 0, Date.now(), input.deletedAt],
  );
}

export async function renameProfile(id: string, nombre: string): Promise<Perfil> {
  const db = await getDatabase();
  await db.runAsync('UPDATE perfiles SET nombre = ?, updated_at = ?, dirty = 1 WHERE id = ?;', [
    nombre,
    Date.now(),
    id,
  ]);
  return (await getProfile(id)) as Perfil;
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE perfiles SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?;', [
    Date.now(),
    Date.now(),
    id,
  ]);
}
