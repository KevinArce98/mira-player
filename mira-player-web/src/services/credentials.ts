const PREFIX = 'xtream_pwd_';

function key(accountId: string): string {
  return `${PREFIX}${accountId}`;
}

export function savePassword(accountId: string, password: string): void {
  sessionStorage.setItem(key(accountId), password);
}

export function getPassword(accountId: string): string | null {
  return sessionStorage.getItem(key(accountId));
}

export function deletePassword(accountId: string): void {
  sessionStorage.removeItem(key(accountId));
}
