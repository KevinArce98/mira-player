export type Tipo = 'live' | 'movie' | 'series';

export function buildCanonicalKey(
  tipo: Tipo,
  streamId: number | string,
  temporada?: number | null,
  episodio?: number | null,
): string {
  if (tipo === 'series' && temporada != null && episodio != null) {
    return `series:${streamId}:${temporada}:${episodio}`;
  }
  return `${tipo}:${streamId}`;
}

const KEY_RE = /^(live|movie|series):[^:]+(?::\d+:\d+)?$/;

export function isValidCanonicalKey(key: unknown): key is string {
  return typeof key === 'string' && KEY_RE.test(key);
}
