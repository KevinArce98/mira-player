import type { StoredAccount } from '@/core/store';
import { createId } from '@/core/id';
import { deleteProfile, listProfiles, upsertProfile } from '@/core/profiles';
import { setActiveProfileId, setCursor } from './sync-meta';
import { getDeviceId, getSyncSecret, saveSyncSecret, setDeviceId } from './secret-store';
import { isSyncConfigured } from './config';
import { resolveAccount } from './client';

let inFlight: Promise<void> | null = null;

export function bootstrapSyncSession(account: StoredAccount, acctKey: string): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doBootstrap(account, acctKey).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doBootstrap(account: StoredAccount, acctKey: string): Promise<void> {
  if (!isSyncConfigured()) return;

  let deviceId = getDeviceId();
  if (!deviceId) {
    deviceId = createId();
    setDeviceId(deviceId);
  }

  const res = await resolveAccount({
    servidor: account.server,
    usuario: account.username,
    password: account.password,
    deviceId,
    platform: 'tizen',
  });
  saveSyncSecret(res.accountSecret);
  setDeviceId(res.deviceId);

  const canonical = res.profiles.find((p) => p.isDefault) ?? res.profiles[0];
  if (!canonical) return;

  const serverIds = new Set(res.profiles.map((p) => p.id));
  for (const p of res.profiles) {
    upsertProfile(acctKey, { id: p.id, nombre: p.nombre, avatar: p.avatar, isKids: p.isKids });
  }
  for (const local of listProfiles(acctKey)) {
    if (!serverIds.has(local.id)) deleteProfile(acctKey, local.id);
  }

  setActiveProfileId(acctKey, canonical.id);
  setCursor(canonical.id, 0);
}

export async function ensureSyncBootstrapped(account: StoredAccount, acctKey: string): Promise<void> {
  if (!isSyncConfigured()) return;
  if (getSyncSecret()) return;
  await bootstrapSyncSession(account, acctKey);
}
