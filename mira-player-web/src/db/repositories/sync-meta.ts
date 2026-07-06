import { getDatabase } from '@/db';
import { createProfile } from '@/db/repositories/profiles';

const KEY_ACTIVE_PROFILE = 'active_profile_id';
const KEY_ACCOUNT_ID = 'account_id';
const KEY_DEVICE_ID = 'device_id';
const KEY_CURSOR_PREFIX = 'sync_cursor_';

export async function getSyncState(clave: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ valor: string | null }>(
    'SELECT valor FROM sync_state WHERE clave = ?;',
    [clave],
  );
  return row?.valor ?? null;
}

export async function setSyncState(clave: string, valor: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor;`,
    [clave, valor],
  );
}

export const getActiveProfileId = () => getSyncState(KEY_ACTIVE_PROFILE);
export const setActiveProfileId = (id: string) => setSyncState(KEY_ACTIVE_PROFILE, id);
export const getAccountId = () => getSyncState(KEY_ACCOUNT_ID);
export const setAccountId = (id: string) => setSyncState(KEY_ACCOUNT_ID, id);
export const getDeviceId = () => getSyncState(KEY_DEVICE_ID);
export const setDeviceId = (id: string) => setSyncState(KEY_DEVICE_ID, id);

export const getCursor = (profileId: string) => getSyncState(KEY_CURSOR_PREFIX + profileId);
export const setCursor = (profileId: string, cursor: number) =>
  setSyncState(KEY_CURSOR_PREFIX + profileId, String(cursor));

export async function ensureDefaultProfile(): Promise<string> {
  const existing = await getActiveProfileId();
  if (existing) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM perfiles WHERE id = ? AND deleted_at IS NULL;',
      [existing],
    );
    if (row) return existing;
  }

  const db = await getDatabase();
  const any = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM perfiles WHERE deleted_at IS NULL ORDER BY updated_at ASC LIMIT 1;',
  );
  const profileId = any?.id ?? (await createProfile({ nombre: 'Principal' })).id;

  await backfillProfileId(profileId);
  await setActiveProfileId(profileId);
  return profileId;
}

async function backfillProfileId(profileId: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE progreso SET profile_id = ?, updated_at = COALESCE(updated_at, last_watched_at, ?), dirty = 1 WHERE profile_id IS NULL;',
    [profileId, now],
  );
  await db.runAsync(
    'UPDATE favoritos SET profile_id = ?, updated_at = COALESCE(updated_at, created_at, ?), dirty = 1 WHERE profile_id IS NULL;',
    [profileId, now],
  );
}

export async function markAllDirty(profileId: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE progreso SET profile_id = ?, updated_at = COALESCE(updated_at, last_watched_at, ?), dirty = 1 WHERE profile_id = ? OR profile_id IS NULL;',
    [profileId, now, profileId],
  );
  await db.runAsync(
    'UPDATE favoritos SET profile_id = ?, updated_at = COALESCE(updated_at, created_at, ?), dirty = 1 WHERE profile_id = ? OR profile_id IS NULL;',
    [profileId, now, profileId],
  );
}
