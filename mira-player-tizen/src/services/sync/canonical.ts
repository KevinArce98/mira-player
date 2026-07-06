import type { MediaKind } from '@/core/media';

// Favoritos son a nivel serie/película/canal (no por episodio), a diferencia
// de progreso que sí baja a episodio vía progressKey() en core/media.ts.
export function buildFavoriteCanonicalKey(kind: MediaKind, id: number): string {
  return `${kind}:${id}`;
}
