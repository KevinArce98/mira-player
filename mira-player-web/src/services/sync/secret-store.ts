const KEY = 'mira_sync_account_secret';

export async function saveSyncSecret(secret: string): Promise<void> {
  localStorage.setItem(KEY, secret);
}

export async function getSyncSecret(): Promise<string | null> {
  return localStorage.getItem(KEY);
}

export async function deleteSyncSecret(): Promise<void> {
  localStorage.removeItem(KEY);
}
