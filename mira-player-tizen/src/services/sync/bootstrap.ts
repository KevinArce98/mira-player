import type { StoredAccount } from '@/core/store';
import { listProfiles, upsertProfile } from '@/core/profiles';
import { getActiveProfileId, setActiveProfileId } from './sync-meta';
import { getDeviceId, getSyncSecret, saveSyncSecret, setDeviceId } from './secret-store';
import { isSyncConfigured } from './config';
import { pushProfile, resolveAccount } from './client';

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
    deviceId = crypto.randomUUID();
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

  const serverIds = new Set(res.profiles.map((p) => p.id));
  for (const p of res.profiles) {
    upsertProfile(acctKey, { id: p.id, nombre: p.nombre, avatar: p.avatar, isKids: p.isKids });
  }

  let profileId = getActiveProfileId(acctKey);
  const localProfiles = listProfiles(acctKey);
  if (!profileId || !localProfiles.some((p) => p.id === profileId)) {
    profileId = localProfiles[0]?.id ?? upsertProfile(acctKey, { id: crypto.randomUUID(), nombre: 'Principal' }).id;
    setActiveProfileId(acctKey, profileId);
  }

  for (const local of listProfiles(acctKey)) {
    if (!serverIds.has(local.id)) {
      await pushProfile(res.accountSecret, local.id, local.nombre, {
        avatar: local.avatar,
        isKids: local.isKids,
      });
    }
  }
}

export async function ensureSyncBootstrapped(account: StoredAccount, acctKey: string): Promise<void> {
  if (!isSyncConfigured()) return;
  if (getSyncSecret()) return;
  await bootstrapSyncSession(account, acctKey);
}
