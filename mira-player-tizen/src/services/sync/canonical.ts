import type { MediaKind } from '@/core/media';

export function buildFavoriteCanonicalKey(kind: MediaKind, id: number): string {
  return `${kind}:${id}`;
}
