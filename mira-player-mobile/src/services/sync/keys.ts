import { buildCanonicalKey, type CanonicalTipo } from '@/lib/canonical';

export interface ParsedKey {
  tipo: CanonicalTipo;
  streamId: string;
  temporada: number | null;
  episodio: number | null;
}

export function parseCanonicalKey(key: string): ParsedKey | null {
  const parts = key.split(':');
  const tipo = parts[0] as CanonicalTipo;
  if (tipo !== 'live' && tipo !== 'movie' && tipo !== 'series') return null;
  if (tipo === 'series' && parts.length === 4) {
    return { tipo, streamId: parts[1], temporada: Number(parts[2]), episodio: Number(parts[3]) };
  }
  if (parts.length === 2) {
    return { tipo, streamId: parts[1], temporada: null, episodio: null };
  }
  return null;
}

export { buildCanonicalKey };
