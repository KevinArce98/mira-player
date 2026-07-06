import type { MediaItem, MediaKind } from './media';

const key = (acct: string) => `mira_fav_${acct}`;

export interface FavoriteEntry {
  item: MediaItem;
  createdAt: number;
  deletedAt: number | null;
}

function read(acct: string): FavoriteEntry[] {
  try {
    return JSON.parse(localStorage.getItem(key(acct)) || '[]') as FavoriteEntry[];
  } catch {
    return [];
  }
}

function write(acct: string, entries: FavoriteEntry[]): void {
  localStorage.setItem(key(acct), JSON.stringify(entries));
}

export function listFavorites(acct: string): MediaItem[] {
  return read(acct)
    .filter((e) => e.deletedAt === null)
    .map((e) => e.item);
}

export function isFavorite(acct: string, kind: MediaKind, id: number): boolean {
  return read(acct).some((e) => e.deletedAt === null && e.item.kind === kind && e.item.id === id);
}

// Alterna y devuelve el nuevo estado (true = ahora es favorito). Los borrados
// son soft-delete (deletedAt) para poder propagarlos al sync como tombstone.
export function toggleFavorite(acct: string, item: MediaItem): boolean {
  const entries = read(acct);
  const idx = entries.findIndex((e) => e.item.kind === item.kind && e.item.id === item.id);
  const now = Date.now();

  if (idx >= 0 && entries[idx].deletedAt === null) {
    entries[idx] = { ...entries[idx], deletedAt: now };
    write(acct, entries);
    return false;
  }
  if (idx >= 0) {
    entries[idx] = { item, createdAt: entries[idx].createdAt, deletedAt: null };
  } else {
    entries.unshift({ item, createdAt: now, deletedAt: null });
  }
  write(acct, entries);
  return true;
}

export function listAllFavoriteEntries(acct: string): FavoriteEntry[] {
  return read(acct);
}

export function applyRemoteFavorite(
  acct: string,
  item: MediaItem,
  createdAt: number,
  deletedAt: number | null,
): void {
  const entries = read(acct);
  const idx = entries.findIndex((e) => e.item.kind === item.kind && e.item.id === item.id);
  if (idx >= 0) entries[idx] = { item, createdAt, deletedAt };
  else entries.push({ item, createdAt, deletedAt });
  write(acct, entries);
}
