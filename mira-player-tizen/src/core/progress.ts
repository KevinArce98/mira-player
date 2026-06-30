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
}

function read(acct: string): ProgressEntry[] {
  try {
    return JSON.parse(localStorage.getItem(key(acct)) || '[]') as ProgressEntry[];
  } catch {
    return [];
  }
}

function write(acct: string, entries: ProgressEntry[]): void {
  localStorage.setItem(key(acct), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

// Lista para "Continuar viendo", más reciente primero (sin canales en vivo).
export function continueWatching(acct: string): ProgressEntry[] {
  return read(acct)
    .filter((e) => e.resume.kind !== 'live')
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProgress(acct: string, resume: ResumePayload): ProgressEntry | undefined {
  const k = progressKey(resume);
  return read(acct).find((e) => e.key === k);
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
  // Casi terminado: lo quitamos de "continuar viendo".
  if (durationMs > 0 && positionMs / durationMs > 0.95) {
    write(acct, entries);
    return;
  }
  entries.unshift({ key: k, item, resume, positionMs, durationMs, updatedAt: Date.now() });
  write(acct, entries);
}

export function removeProgress(acct: string, resume: ResumePayload): void {
  const k = progressKey(resume);
  write(acct, read(acct).filter((e) => e.key !== k));
}
