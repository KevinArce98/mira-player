import type { XtreamCredentials } from '@/types/xtream';

const KEY = 'mira_tizen_account';

export interface StoredAccount extends XtreamCredentials {
  name: string;
}

// En la TV no hay sessionStorage volátil útil para multi-perfil; guardamos la
// cuenta en localStorage para no pedir login en cada arranque.
export function loadAccount(): StoredAccount | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAccount;
    if (!parsed.server || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAccount(account: StoredAccount): void {
  localStorage.setItem(KEY, JSON.stringify(account));
}

export function clearAccount(): void {
  localStorage.removeItem(KEY);
}

// Clave estable para namespacing de favoritos/progreso por cuenta.
export function accountKey(account: StoredAccount): string {
  return `${account.username}@${account.server}`.replace(/[^a-zA-Z0-9@._-]/g, '_');
}
