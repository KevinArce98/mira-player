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

// Lista para "Continuar viendo", más reciente primero (sin canales en vivo ni completados).
export function continueWatching(acct: string): ProgressEntry[] {
  return read(acct)
    .filter((e) => e.resume.kind !== 'live' && !e.completado)
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
  const completado = durationMs > 0 && positionMs / durationMs > 0.95;
  entries.unshift({ key: k, item, resume, positionMs, durationMs, updatedAt: Date.now(), completado });
  write(acct, entries);
}

// Marca un episodio/película como visto sin depender de la posición (ej. al
// saltar al siguiente episodio antes de llegar al final real del video).
// Preserva posición/duración existentes si ya había una entrada.
export function completeProgress(acct: string, item: MediaItem, resume: ResumePayload): void {
  const k = progressKey(resume);
  const entries = read(acct);
  const idx = entries.findIndex((e) => e.key === k);
  const now = Date.now();
  if (idx >= 0) {
    const existing = entries[idx];
    entries.splice(idx, 1);
    entries.unshift({ ...existing, completado: true, updatedAt: now });
  } else {
    entries.unshift({ key: k, item, resume, positionMs: 0, durationMs: 0, updatedAt: now, completado: true });
  }
  write(acct, entries);
}

export function removeProgress(acct: string, resume: ResumePayload): void {
  const k = progressKey(resume);
  write(acct, read(acct).filter((e) => e.key !== k));
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
