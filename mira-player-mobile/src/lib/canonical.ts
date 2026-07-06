export type CanonicalTipo = 'live' | 'movie' | 'series';

export function buildCanonicalKey(
  tipo: CanonicalTipo,
  streamId: number | string,
  temporada?: number | null,
  episodio?: number | null,
): string {
  if (tipo === 'series' && temporada != null && episodio != null) {
    return `series:${streamId}:${temporada}:${episodio}`;
  }
  return `${tipo}:${streamId}`;
}
