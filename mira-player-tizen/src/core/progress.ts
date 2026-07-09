import type { MediaItem, ResumePayload } from './media';
import { progressKey } from './media';

const key = (acct: string) => `mira_prog_${acct}`;
const MAX_ENTRIES = 30;

export interface ProgressEntry {
  key: string;
  item: MediaItem;
  resume: ResumePayload;
  positionMs: number;
  durationMs: number;
  updatedAt: number;
  completado: boolean;
  deletedAt: number | null;
  syncedAt: number | null;
}

function read(acct: string): ProgressEntry[] {
  try {
    return JSON.parse(localStorage.getItem(key(acct)) || '[]') as ProgressEntry[];
  } catch {
    return [];
  }
}

function write(acct: string, entries: ProgressEntry[]): void {
  const unsynced = entries.filter((e) => e.syncedAt == null);
  const synced = entries.filter((e) => e.syncedAt != null);
  const budget = Math.max(0, MAX_ENTRIES - unsynced.length);
  const trimmed = [...unsynced, ...synced.slice(0, budget)].sort((a, b) => b.updatedAt - a.updatedAt);
  localStorage.setItem(key(acct), JSON.stringify(trimmed));
}

export function markAllSynced(acct: string, syncedAt: number): void {
  const entries = read(acct).map((e) => ({ ...e, syncedAt: e.syncedAt ?? syncedAt }));
  write(acct, entries);
}

// Lista para "Continuar viendo", más reciente primero (sin canales en vivo ni completados).
export function continueWatching(acct: string): ProgressEntry[] {
  return read(acct)
    .filter((e) => e.resume.kind !== 'live' && !e.completado && e.deletedAt === null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProgress(acct: string, resume: ResumePayload): ProgressEntry | undefined {
  const k = progressKey(resume);
  return read(acct).find((e) => e.key === k && e.deletedAt === null);
}

export function saveProgress(
  acct: string,
  item: MediaItem,
  resume: ResumePayload,
  positionMs: number,
  durationMs: number,
): void {
  const k = progressKey(resume);
  const entries = read(acct).filter((e) => e.key !== k);
  const completado = durationMs > 0 && positionMs / durationMs > 0.95;
  entries.unshift({
    key: k,
    item,
    resume,
    positionMs,
    durationMs,
    updatedAt: Date.now(),
    completado,
    deletedAt: null,
    syncedAt: null,
  });
  write(acct, entries);
}

export function completeProgress(acct: string, item: MediaItem, resume: ResumePayload): void {
  const k = progressKey(resume);
  const entries = read(acct);
  const idx = entries.findIndex((e) => e.key === k);
  const now = Date.now();
  if (idx >= 0) {
    const existing = entries[idx];
    entries.splice(idx, 1);
    entries.unshift({ ...existing, completado: true, updatedAt: now, deletedAt: null, syncedAt: null });
  } else {
    entries.unshift({
      key: k,
      item,
      resume,
      positionMs: 0,
      durationMs: 0,
      updatedAt: now,
      completado: true,
      deletedAt: null,
      syncedAt: null,
    });
  }
  write(acct, entries);
}

export function removeProgress(acct: string, resume: ResumePayload): void {
  const k = progressKey(resume);
  const entries = read(acct);
  const idx = entries.findIndex((e) => e.key === k);
  if (idx < 0) return;
  const now = Date.now();
  entries[idx] = { ...entries[idx], deletedAt: now, updatedAt: now, syncedAt: null };
  write(acct, entries);
}

export function listAllProgressEntries(acct: string): ProgressEntry[] {
  return read(acct);
}

export function applyRemoteProgress(
  acct: string,
  entry: ProgressEntry,
): void {
  const entries = read(acct).filter((e) => e.key !== entry.key);
  entries.unshift(entry);
  write(acct, entries);
}
