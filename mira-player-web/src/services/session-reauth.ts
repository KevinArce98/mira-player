import { deletePassword } from './credentials';
import { deleteSyncSecret } from './sync/secret-store';

const KEY = 'mira_reauth_version';

// Bump this string to force every device to log in again on next launch.
// The re-login runs the sync bootstrap (markAllDirty), which uploads any
// local-only history to the server before it can be lost.
const REAUTH_VERSION = '2026-07-sync-2';

export function isReauthPending(): boolean {
  return localStorage.getItem(KEY) !== REAUTH_VERSION;
}

export function markReauthDone(): void {
  localStorage.setItem(KEY, REAUTH_VERSION);
}

/**
 * Clears the session credentials so the user is forced back through login,
 * WITHOUT touching the local DB (progress/favorites are preserved and will be
 * pushed up on the next bootstrap).
 */
export async function applyReauthReset(accountId: string | null): Promise<void> {
  await deleteSyncSecret();
  if (accountId) deletePassword(accountId);
}
