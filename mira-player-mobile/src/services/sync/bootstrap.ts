import { uuid } from '@/lib/id';
import { getAccount } from '@/db/repositories/accounts';
import { applyServerProfile, deleteProfile, listProfiles } from '@/db/repositories/profiles';
import {
  getDeviceId,
  rekeyDataToProfile,
  resetCursor,
  setAccountId,
  setActiveProfileId,
  setDeviceId,
} from '@/db/repositories/sync-meta';
import { getPassword } from '@/services/credentials';
import { isDemoAccount } from '@/services/demo';
import { isSyncConfigured } from './config';
import { resolveAccount } from './client';
import { getSyncSecret, saveSyncSecret } from './secret-store';

let inFlight: Promise<void> | null = null;

export function bootstrapSyncSession(input: {
  servidor: string;
  usuario: string;
  password: string;
}): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doBootstrapSyncSession(input).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doBootstrapSyncSession(input: {
  servidor: string;
  usuario: string;
  password: string;
}): Promise<void> {
  if (!isSyncConfigured()) return;

  let deviceId = await getDeviceId();
  if (!deviceId) {
    deviceId = uuid();
    await setDeviceId(deviceId);
  }

  const res = await resolveAccount({ ...input, deviceId, platform: 'mobile' });
  await saveSyncSecret(res.accountSecret);
  await setAccountId(res.accountId);
  await setDeviceId(res.deviceId);

  const canonical = res.profiles.find((p) => p.isDefault) ?? res.profiles[0];
  if (!canonical) return;

  const serverIds = new Set(res.profiles.map((p) => p.id));
  for (const p of res.profiles) {
    await applyServerProfile({
      id: p.id,
      nombre: p.nombre,
      avatar: p.avatar,
      isKids: p.isKids,
      deletedAt: null,
    });
  }

  for (const local of await listProfiles()) {
    if (!serverIds.has(local.id)) await deleteProfile(local.id);
  }

  await rekeyDataToProfile(canonical.id);
  await setActiveProfileId(canonical.id);
  await resetCursor(canonical.id);
}

export async function ensureSyncBootstrapped(): Promise<void> {
  if (!isSyncConfigured()) return;
  if (await getSyncSecret()) return;

  const account = await getAccount();
  if (!account || isDemoAccount(account)) return;
  const password = await getPassword(account.id);
  if (!password) return;

  await bootstrapSyncSession({
    servidor: account.servidor,
    usuario: account.usuario,
    password,
  });
}
