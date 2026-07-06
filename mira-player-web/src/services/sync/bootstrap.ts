import { uuid } from '@/lib/id';
import { getAccount } from '@/db/repositories/accounts';
import { createProfile, listProfiles } from '@/db/repositories/profiles';
import {
  ensureDefaultProfile,
  getDeviceId,
  markAllDirty,
  setAccountId,
  setDeviceId,
} from '@/db/repositories/sync-meta';
import { getPassword } from '@/services/credentials';
import { isSyncConfigured } from './config';
import { resolveAccount, pushProfile } from './client';
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

  const res = await resolveAccount({ ...input, deviceId, platform: 'web' });
  await saveSyncSecret(res.accountSecret);
  await setAccountId(res.accountId);
  await setDeviceId(res.deviceId);

  const serverIds = new Set(res.profiles.map((p) => p.id));
  for (const p of res.profiles) {
    await createProfile({ id: p.id, nombre: p.nombre, avatar: p.avatar, isKids: p.isKids });
  }

  const profileId = await ensureDefaultProfile();
  await markAllDirty(profileId);

  for (const local of await listProfiles()) {
    if (!serverIds.has(local.id)) {
      await pushProfile(res.accountSecret, local.id, local.nombre, {
        avatar: local.avatar,
        isKids: local.is_kids,
      });
    }
  }
}

export async function ensureSyncBootstrapped(): Promise<void> {
  if (!isSyncConfigured()) return;
  if (await getSyncSecret()) return;

  const account = await getAccount();
  if (!account) return;
  const password = getPassword(account.id);
  if (!password) return;

  await bootstrapSyncSession({
    servidor: account.servidor,
    usuario: account.usuario,
    password,
  });
}
