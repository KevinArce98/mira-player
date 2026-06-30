import type { MediaItem, MediaKind } from './media';

const key = (acct: string) => `mira_fav_${acct}`;

function read(acct: string): MediaItem[] {
  try {
    return JSON.parse(localStorage.getItem(key(acct)) || '[]') as MediaItem[];
  } catch {
    return [];
  }
}

function write(acct: string, items: MediaItem[]): void {
  localStorage.setItem(key(acct), JSON.stringify(items));
}

export function listFavorites(acct: string): MediaItem[] {
  return read(acct);
}

export function isFavorite(acct: string, kind: MediaKind, id: number): boolean {
  return read(acct).some((i) => i.kind === kind && i.id === id);
}

// Alterna y devuelve el nuevo estado (true = ahora es favorito).
export function toggleFavorite(acct: string, item: MediaItem): boolean {
  const items = read(acct);
  const idx = items.findIndex((i) => i.kind === item.kind && i.id === item.id);
  if (idx >= 0) {
    items.splice(idx, 1);
    write(acct, items);
    return false;
  }
  items.unshift(item);
  write(acct, items);
  return true;
}
