import * as SecureStore from 'expo-secure-store';

import { deletePassword } from './credentials';
import { deleteSyncSecret } from './sync/secret-store';

const KEY = 'mira_reauth_version';
const REAUTH_VERSION = '2026-07-sync-2';

export async function isReauthPending(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) !== REAUTH_VERSION;
}

export async function markReauthDone(): Promise<void> {
  await SecureStore.setItemAsync(KEY, REAUTH_VERSION);
}

export async function applyReauthReset(accountId: string | null): Promise<void> {
  await deleteSyncSecret();
  if (accountId) await deletePassword(accountId);
}
