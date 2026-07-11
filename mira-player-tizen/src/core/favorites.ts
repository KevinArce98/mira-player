import type { MediaItem, MediaKind } from './media';

const key = (acct: string) => `mira_fav_${acct}`;

export interface FavoriteEntry {
  item: MediaItem;
  createdAt: number;
  deletedAt: number | null;
  profileId: string | null;
}

function owned(entry: FavoriteEntry, profileId: string | null): boolean {
  return entry.profileId === null || entry.profileId === profileId;
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

export function listFavorites(acct: string, profileId: string | null): MediaItem[] {
  return read(acct)
    .filter((e) => e.deletedAt === null && owned(e, profileId))
    .map((e) => e.item);
}

export function isFavorite(acct: string, kind: MediaKind, id: number, profileId: string | null): boolean {
  return read(acct).some(
    (e) => e.deletedAt === null && e.item.kind === kind && e.item.id === id && owned(e, profileId),
  );
}

export function toggleFavorite(acct: string, item: MediaItem, profileId: string | null): boolean {
  const entries = read(acct);
  const idx = entries.findIndex((e) => e.item.kind === item.kind && e.item.id === item.id && owned(e, profileId));
  const now = Date.now();

  if (idx >= 0 && entries[idx].deletedAt === null) {
    entries[idx] = { ...entries[idx], deletedAt: now, profileId };
    write(acct, entries);
    return false;
  }
  if (idx >= 0) {
    entries[idx] = { item, createdAt: entries[idx].createdAt, deletedAt: null, profileId };
  } else {
    entries.unshift({ item, createdAt: now, deletedAt: null, profileId });
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
  profileId: string | null,
): void {
  const entries = read(acct);
  const idx = entries.findIndex((e) => e.item.kind === item.kind && e.item.id === item.id && owned(e, profileId));
  if (idx >= 0) entries[idx] = { item, createdAt, deletedAt, profileId };
  else entries.push({ item, createdAt, deletedAt, profileId });
  write(acct, entries);
}
