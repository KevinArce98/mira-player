const SECRET_KEY = 'mira_sync_account_secret';
const DEVICE_KEY = 'mira_sync_device_id';

export function getSyncSecret(): string | null {
  return localStorage.getItem(SECRET_KEY);
}

export function saveSyncSecret(secret: string): void {
  localStorage.setItem(SECRET_KEY, secret);
}

export function deleteSyncSecret(): void {
  localStorage.removeItem(SECRET_KEY);
}

export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE_KEY);
}

export function setDeviceId(id: string): void {
  localStorage.setItem(DEVICE_KEY, id);
}
